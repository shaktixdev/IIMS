import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import ItemReturn from "../models/ItemReturn.model.js";
import IssueVoucher from "../models/IssueVoucher.model.js";
import Stock from "../models/Stock.model.js";
import StockMovement from "../models/StockMovement.model.js";
import Item from "../models/Item.model.js";
import Batch from "../models/Batch.model.js";
import SerialNumber from "../models/SerialNumber.model.js";

const router = Router();

// GET /api/returns
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const match: any = { isDeleted: false };
    if (search) match.returnNumber = { $regex: search, $options: "i" };

    const total = await ItemReturn.countDocuments(match);
    const returns = await ItemReturn.find(match)
      .populate("issueVoucher", "ivNumber")
      .populate("receivedBy", "name")
      .populate("items.item", "name sku")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: returns,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/returns/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid Return ID" } });
      return;
    }

    const returnDoc = await ItemReturn.findOne({ _id: id, isDeleted: false })
      .populate("issueVoucher", "ivNumber requester.name requester.departmentName approver.name warehouse")
      .populate("receivedBy", "name")
      .populate("items.item", "name sku unit")
      .populate("items.serialNumbers", "serialNumber status");

    if (!returnDoc) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Return document not found." } });
      return;
    }

    res.status(200).json({ success: true, data: returnDoc });
  } catch (error) {
    next(error);
  }
});

// POST /api/returns
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { issueVoucherId, items, remarks, receivedBy } = req.body;

    if (!issueVoucherId || !items || !Array.isArray(items) || items.length === 0 || !receivedBy) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields." } });
      return;
    }

    const voucher = await IssueVoucher.findOne({ _id: issueVoucherId, isDeleted: false }).session(session);
    if (!voucher) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Original Issue Voucher not found." } });
      return;
    }

    // 1. Validate returnedQty <= pendingQty for each line
    for (const returnLine of items) {
      const originalLine = voucher.items.id(returnLine.issueLineId);
      if (!originalLine) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: `Line item ${returnLine.issueLineId} not found in issue voucher.` } });
        await session.abortTransaction();
        session.endSession();
        return;
      }
      const pending = originalLine.issuedQty - originalLine.returnedQty;
      if (returnLine.returnedQty > pending) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Return quantity (${returnLine.returnedQty}) exceeds pending issued quantity (${pending}) for item.`,
          },
        });
        await session.abortTransaction();
        session.endSession();
        return;
      }
    }

    // 2. Create the ItemReturn record
    const returnDoc = new ItemReturn({
      issueVoucher: issueVoucherId,
      receivedBy,
      items: items.map(line => ({
        issueLineId: line.issueLineId,
        item: line.item,
        returnedQty: line.returnedQty,
        condition: line.condition,
        notes: line.notes || "",
        serialNumbers: line.serialNumbers ? line.serialNumbers.map((s: string) => new mongoose.Types.ObjectId(s)) : [],
      })),
      remarks,
    });
    await returnDoc.save({ session });

    // 3. Increment stock & update returned quantities on original voucher
    for (const returnLine of items) {
      const originalLine = voucher.items.id(returnLine.issueLineId);
      originalLine.returnedQty += returnLine.returnedQty;

      // Add back to batch if batch-tracked
      let batchDoc: any = null;
      if (originalLine.batches && originalLine.batches.length > 0) {
        const batchId = originalLine.batches[0].batchId;
        batchDoc = await Batch.findById(batchId).session(session);
        if (batchDoc && returnLine.condition !== "damaged") {
          batchDoc.currentQuantity += returnLine.returnedQty;
          await batchDoc.save({ session });
        }
      }

      // Add back serial numbers if serial-tracked
      if (returnLine.serialNumbers && Array.isArray(returnLine.serialNumbers)) {
        for (const snId of returnLine.serialNumbers) {
          const snDoc = await SerialNumber.findById(snId).session(session);
          if (snDoc) {
            snDoc.status = returnLine.condition === "damaged" ? "DEFECTIVE" : "AVAILABLE";
            await snDoc.save({ session });
          }
        }
      }

      // Add back to stock only if condition is NOT 'damaged'
      const addBack = returnLine.condition !== "damaged" ? returnLine.returnedQty : 0;
      if (addBack > 0) {
        let stock = await Stock.findOne({ item: returnLine.item, warehouse: voucher.warehouse }).session(session);
        if (!stock) {
          stock = new Stock({
            item: returnLine.item,
            warehouse: voucher.warehouse,
            quantityOnHand: 0,
            quantityReserved: 0,
            averageCost: 0,
          });
        }
        stock.quantityOnHand += addBack;
        stock.lastMovement = new Date();
        await stock.save({ session });

        // Log StockMovement
        const movement = new StockMovement({
          item: returnLine.item,
          warehouse: voucher.warehouse,
          type: "IN",
          quantity: addBack,
          referenceType: "RETURN",
          referenceId: returnDoc._id,
          batch: batchDoc ? batchDoc._id : undefined
        });
        await movement.save({ session });
      }
    }

    // 4. Update voucher status
    const allReturned = voucher.items.every((i: any) => i.returnedQty >= i.issuedQty);
    const anyReturned = voucher.items.some((i: any) => i.returnedQty > 0);
    voucher.status = allReturned ? "fully_returned" : anyReturned ? "partial_return" : "issued";

    // 5. Link returnDoc to issue voucher returns array
    voucher.returns.push(returnDoc._id);
    await voucher.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: returnDoc, message: "Returned materials processed successfully." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

export default router;
