import mongoose from "mongoose";
import Transfer, { ITransfer } from "../models/Transfer.model.js";
import Stock from "../models/Stock.model.js";
import StockMovement from "../models/StockMovement.model.js";

/**
 * Dispatches a transfer:
 * 1. Deducts quantityOnHand from source warehouse.
 * 2. Adds quantityInTransit to source warehouse.
 * 3. Logs a negative StockMovement (TRANSFER) for the source warehouse.
 * 4. Updates transfer status to 'in_transit'.
 */
export async function dispatchTransfer(transferId: string, userId: string): Promise<ITransfer> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await Transfer.findById(transferId).session(session);
    if (!transfer) {
      throw new Error("Transfer not found.");
    }
    if (transfer.status !== "draft") {
      throw new Error("Only draft transfers can be dispatched.");
    }

    const fromWH = transfer.fromWarehouse;

    for (const item of transfer.items) {
      const dispatchedQty = item.requestedQty;

      // 1. Verify and update source warehouse stock
      let sourceStock = await Stock.findOne({ item: item.item, warehouse: fromWH }).session(session);
      if (!sourceStock || sourceStock.quantityAvailable < dispatchedQty) {
        throw new Error(`Insufficient stock for item ID ${item.item} in source warehouse.`);
      }

      // Deduct from source onHand, add to transit
      sourceStock.quantityOnHand -= dispatchedQty;
      sourceStock.quantityInTransit += dispatchedQty;
      sourceStock.lastMovement = new Date();
      await sourceStock.save({ session });

      // 2. Set line item dispatchedQty
      item.dispatchedQty = dispatchedQty;

      // 3. Create stock movement (outbound)
      const movement = new StockMovement({
        item: item.item,
        warehouse: fromWH,
        type: "TRANSFER",
        quantity: -dispatchedQty,
        referenceType: "TRANSFER",
        referenceId: transfer._id,
        performedBy: new mongoose.Types.ObjectId(userId),
        notes: `Transfer dispatched to warehouse ${transfer.toWarehouse}`,
      });
      await movement.save({ session });
    }

    transfer.status = "in_transit";
    transfer.dispatchDate = new Date();
    transfer.dispatchedBy = new mongoose.Types.ObjectId(userId);
    await transfer.save({ session });

    await session.commitTransaction();
    session.endSession();
    return transfer;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

/**
 * Receives a transfer:
 * 1. Deducts quantityInTransit from source warehouse.
 * 2. Adds quantityOnHand to destination warehouse.
 * 3. Adjusts destination average cost based on source valuation.
 * 4. Logs a positive StockMovement (TRANSFER) for the destination warehouse.
 * 5. Updates status to 'received' or 'partial'.
 */
export async function receiveTransfer(
  transferId: string,
  receivedItems: Array<{ item: string; receivedQty: number; toZone?: string; toBin?: string }>,
  userId: string
): Promise<ITransfer> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await Transfer.findById(transferId).session(session);
    if (!transfer) {
      throw new Error("Transfer not found.");
    }
    if (transfer.status !== "in_transit") {
      throw new Error("Only in-transit transfers can be received.");
    }

    const fromWH = transfer.fromWarehouse;
    const toWH = transfer.toWarehouse;
    let allReceivedMatched = true;

    for (const item of transfer.items) {
      const match = receivedItems.find((r) => r.item.toString() === item.item.toString());
      const receivedQty = match ? Math.max(0, match.receivedQty) : 0;
      const dispatchedQty = item.dispatchedQty || 0;

      if (receivedQty < dispatchedQty) {
        allReceivedMatched = false;
      }

      // 1. Deduct quantityInTransit from source warehouse
      const sourceStock = await Stock.findOne({ item: item.item, warehouse: fromWH }).session(session);
      if (sourceStock) {
        sourceStock.quantityInTransit = Math.max(0, sourceStock.quantityInTransit - dispatchedQty);
        await sourceStock.save({ session });
      }
      const sourceCost = sourceStock ? sourceStock.averageCost : 0;

      // 2. Find or create destination stock
      let destStock = await Stock.findOne({ item: item.item, warehouse: toWH }).session(session);
      if (!destStock) {
        destStock = new Stock({
          item: item.item,
          warehouse: toWH,
          quantityOnHand: 0,
          quantityReserved: 0,
          averageCost: sourceCost,
        });
      }

      // Calculate new average cost for destination using source's average cost
      if (receivedQty > 0) {
        const oldTotalVal = destStock.quantityOnHand * destStock.averageCost;
        const newTotalVal = oldTotalVal + receivedQty * sourceCost;
        destStock.quantityOnHand += receivedQty;
        destStock.averageCost = destStock.quantityOnHand > 0 ? newTotalVal / destStock.quantityOnHand : sourceCost;
      }

      if (match?.toZone) destStock.zone = match.toZone;
      if (match?.toBin) destStock.bin = match.toBin;
      destStock.lastMovement = new Date();
      await destStock.save({ session });

      // Update line items
      item.receivedQty = receivedQty;
      if (match?.toZone) item.toZone = match.toZone;
      if (match?.toBin) item.toBin = match.toBin;

      // 3. Create stock movement (inbound)
      if (receivedQty > 0) {
        const movement = new StockMovement({
          item: item.item,
          warehouse: toWH,
          type: "TRANSFER",
          quantity: receivedQty,
          referenceType: "TRANSFER",
          referenceId: transfer._id,
          performedBy: new mongoose.Types.ObjectId(userId),
          notes: `Transfer received from warehouse ${transfer.fromWarehouse}`,
        });
        await movement.save({ session });
      }
    }

    transfer.status = allReceivedMatched ? "received" : "partial";
    transfer.receivedDate = new Date();
    transfer.receivedBy = new mongoose.Types.ObjectId(userId);
    await transfer.save({ session });

    await session.commitTransaction();
    session.endSession();
    return transfer;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

/**
 * Cancels a transfer:
 * If status was 'in_transit', stock is returned to 'quantityOnHand' and deducted from 'quantityInTransit'.
 */
export async function cancelTransfer(transferId: string, userId: string): Promise<ITransfer> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await Transfer.findById(transferId).session(session);
    if (!transfer) {
      throw new Error("Transfer not found.");
    }
    if (transfer.status !== "draft" && transfer.status !== "in_transit") {
      throw new Error("Only draft or in-transit transfers can be cancelled.");
    }

    if (transfer.status === "in_transit") {
      const fromWH = transfer.fromWarehouse;

      for (const item of transfer.items) {
        const dispatchedQty = item.dispatchedQty || 0;

        const sourceStock = await Stock.findOne({ item: item.item, warehouse: fromWH }).session(session);
        if (sourceStock) {
          // Re-add to onHand, deduct from transit
          sourceStock.quantityOnHand += dispatchedQty;
          sourceStock.quantityInTransit = Math.max(0, sourceStock.quantityInTransit - dispatchedQty);
          await sourceStock.save({ session });
        }

        // Log correction movement back in
        const movement = new StockMovement({
          item: item.item,
          warehouse: fromWH,
          type: "TRANSFER",
          quantity: dispatchedQty,
          referenceType: "TRANSFER",
          referenceId: transfer._id,
          performedBy: new mongoose.Types.ObjectId(userId),
          notes: `Transfer cancelled; items returned to stock.`,
        });
        await movement.save({ session });
      }
    }

    transfer.status = "cancelled";
    await transfer.save({ session });

    await session.commitTransaction();
    session.endSession();
    return transfer;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}
