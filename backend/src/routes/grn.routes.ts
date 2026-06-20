import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import GRN from "../models/GRN.model.js";
import PurchaseOrder from "../models/PurchaseOrder.model.js";
import Stock from "../models/Stock.model.js";
import StockMovement from "../models/StockMovement.model.js";
import Item from "../models/Item.model.js";
import Batch from "../models/Batch.model.js";
import SerialNumber from "../models/SerialNumber.model.js";

const router = Router();

// GET /api/grn
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";

    const match: any = { isDeleted: false };
    if (status) match.status = status;
    if (search) match.grnNumber = { $regex: search, $options: "i" };

    const total = await GRN.countDocuments(match);
    const grns = await GRN.find(match)
      .populate("po", "poNumber")
      .populate("vendor", "name")
      .populate("warehouse", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: grns,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/grn/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid GRN ID" } });
      return;
    }
    const grn = await GRN.findOne({ _id: id, isDeleted: false })
      .populate("po", "poNumber deliveryDate")
      .populate("vendor", "name code gstin")
      .populate("warehouse", "name code")
      .populate("items.item", "name sku isBatchTracked isSerialTracked hasExpiry")
      .populate("receivedBy", "name email");

    if (!grn) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "GRN not found." } });
      return;
    }

    res.status(200).json({ success: true, data: grn });
  } catch (error) {
    next(error);
  }
});

// POST /api/grn (Draft)
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { po, vendor, warehouse, items, referenceDocument, notes } = req.body;

    if (!po || !vendor || !warehouse || !items || !Array.isArray(items)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields" } });
      return;
    }

    const grn = new GRN({
      po,
      vendor,
      warehouse,
      items,
      referenceDocument,
      notes,
      status: "draft"
    });

    await grn.save();
    res.status(201).json({ success: true, data: grn });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/grn/:id
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid GRN ID" } });
      return;
    }

    const grn = await GRN.findOne({ _id: id, isDeleted: false });
    if (!grn) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "GRN not found." } });
      return;
    }
    if (grn.status !== "draft") {
      res.status(409).json({ success: false, error: { code: "CONFLICT", message: "Only draft GRNs can be edited." } });
      return;
    }

    const { items, referenceDocument, notes } = req.body;
    if (items) grn.items = items;
    if (referenceDocument !== undefined) grn.referenceDocument = referenceDocument;
    if (notes !== undefined) grn.notes = notes;

    await grn.save();
    res.status(200).json({ success: true, data: grn });
  } catch (error) {
    next(error);
  }
});

// POST /api/grn/:id/confirm
router.post("/:id/confirm", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const grn = await GRN.findOne({ _id: id, isDeleted: false }).session(session);
    if (!grn) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "GRN not found." } });
      return;
    }
    if (grn.status !== "draft") {
      res.status(409).json({ success: false, error: { code: "CONFLICT", message: "Only draft GRNs can be confirmed." } });
      return;
    }

    const po = await PurchaseOrder.findById(grn.po).session(session);
    if (!po) throw new Error("Linked Purchase Order not found");

    let allItemsReceived = true;

    // Process each line item in GRN
    for (const grnItem of grn.items) {
      if (grnItem.acceptedQty > 0) {
        // Fetch full item details to check tracking flags
        const itemDoc = await Item.findById(grnItem.item).session(session);
        if (!itemDoc) throw new Error(`Item ${grnItem.item} not found`);

        let batch: any = null;

        // 1. Create or Update Batch if item is batch-tracked
        if (itemDoc.isBatchTracked) {
          const bNumber = grnItem.batchNumber || `BAT-${Date.now()}`;
          batch = await Batch.findOne({ 
            batchNumber: bNumber, 
            item: grnItem.item, 
            warehouse: grn.warehouse 
          }).session(session);

          if (batch) {
            batch.currentQuantity += grnItem.acceptedQty;
            batch.initialQuantity += grnItem.acceptedQty;
            if (grnItem.expiryDate) batch.expiryDate = grnItem.expiryDate;
            await batch.save({ session });
          } else {
            batch = new Batch({
              batchNumber: bNumber,
              item: grnItem.item,
              warehouse: grn.warehouse,
              grn: grn._id,
              manufactureDate: new Date(),
              expiryDate: grnItem.expiryDate,
              initialQuantity: grnItem.acceptedQty,
              currentQuantity: grnItem.acceptedQty,
              status: "ACTIVE"
            });
            await batch.save({ session });
          }
        }

        // 2. Create Serial Numbers if item is serial-tracked
        if (itemDoc.isSerialTracked && grnItem.serialNumbers && Array.isArray(grnItem.serialNumbers)) {
          for (const snString of grnItem.serialNumbers) {
            // Check if serial number already exists for this item
            const existingSn = await SerialNumber.findOne({
              item: grnItem.item,
              serialNumber: snString
            }).session(session);

            if (existingSn) {
              throw new Error(`Serial number ${snString} already exists for item ${itemDoc.name}`);
            }

            const sn = new SerialNumber({
              serialNumber: snString,
              item: grnItem.item,
              warehouse: grn.warehouse,
              grn: grn._id,
              batch: batch ? batch._id : undefined,
              status: "AVAILABLE"
            });
            await sn.save({ session });
          }
        }

        // 3. Find or create Stock record
        let stock = await Stock.findOne({ item: grnItem.item, warehouse: grn.warehouse }).session(session);
        if (!stock) {
          stock = new Stock({
            item: grnItem.item,
            warehouse: grn.warehouse,
            quantityOnHand: 0,
            quantityReserved: 0,
            averageCost: 0
          });
        }
        
        // Compute new average cost
        const oldTotalValue = stock.quantityOnHand * stock.averageCost;
        const newTotalValue = oldTotalValue + (grnItem.acceptedQty * (grnItem.unitCost || 0));
        stock.quantityOnHand += grnItem.acceptedQty;
        stock.averageCost = stock.quantityOnHand > 0 ? newTotalValue / stock.quantityOnHand : 0;
        stock.lastMovement = new Date();
        
        // Update stock zone/bin from GRN line
        if (grnItem.zone) stock.zone = grnItem.zone;
        if (grnItem.bin) stock.bin = grnItem.bin;
        
        await stock.save({ session });

        // 4. Create StockMovement with Batch link
        const movement = new StockMovement({
          item: grnItem.item,
          warehouse: grn.warehouse,
          type: "IN",
          quantity: grnItem.acceptedQty,
          referenceType: "GRN",
          referenceId: grn._id,
          batch: batch ? batch._id : undefined
        });
        await movement.save({ session });

        // 5. Update PO received quantities
        const poItem = po.items.find((pi: any) => pi.item.toString() === grnItem.item.toString());
        if (poItem) {
          poItem.receivedQty += grnItem.acceptedQty;
          if (poItem.receivedQty < poItem.quantity) {
            allItemsReceived = false;
          }
        }
      }
    }

    grn.status = "completed";
    await grn.save({ session });

    // Update PO Status
    po.status = allItemsReceived ? "received" : "partial";
    await po.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: grn, message: "GRN confirmed successfully." });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

export default router;
