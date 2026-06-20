import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import StockCount from "../models/StockCount.model.js";
import Stock from "../models/Stock.model.js";
import StockMovement from "../models/StockMovement.model.js";

const router = Router();

// GET /api/stock-counts
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || "";
    const warehouseId = (req.query.warehouse as string) || "";

    const match: any = { isDeleted: false };
    if (status) match.status = status;
    if (warehouseId) match.warehouse = new mongoose.Types.ObjectId(warehouseId);

    const total = await StockCount.countDocuments(match);
    const counts = await StockCount.find(match)
      .populate("warehouse", "name code")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: counts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stock-counts/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const count = await StockCount.findOne({ _id: id, isDeleted: false })
      .populate("warehouse", "name code")
      .populate("items.item", "name sku barcode isBatchTracked isSerialTracked")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email");

    if (!count) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Stock count not found." } });
      return;
    }

    res.status(200).json({ success: true, data: count });
  } catch (error) {
    next(error);
  }
});

// POST /api/stock-counts (Initiate Cycle Count Audit - Takes Snapshot)
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { warehouse, zone, notes } = req.body;
    const userId = req.headers["x-user-id"] as string;

    if (!warehouse) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Warehouse is required." } });
      return;
    }
    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "User header missing." } });
      return;
    }

    // 1. Take a snapshot of all active stock in this warehouse
    const matchCriteria: any = { warehouse: new mongoose.Types.ObjectId(warehouse) };
    if (zone) {
      matchCriteria.zone = zone;
    }

    const stockItems = await Stock.find(matchCriteria).lean();
    if (stockItems.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: "BAD_REQUEST", message: "No stock records exist in the selected scope to audit." },
      });
      return;
    }

    // 2. Build the snapshot items array
    const auditItems = stockItems.map((stock) => ({
      item: stock.item,
      systemQty: stock.quantityOnHand,
      countedQty: stock.quantityOnHand, // Default counted to match system, let them edit deviations
      variance: 0,
      notes: "",
    }));

    const stockCount = new StockCount({
      warehouse,
      zone: zone || "",
      notes: notes || "",
      status: "in_progress", // directly open for editing counts
      items: auditItems,
      startedAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await stockCount.save();
    res.status(201).json({ success: true, data: stockCount });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/stock-counts/:id (Update physical count numbers)
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const count = await StockCount.findOne({ _id: id, isDeleted: false });
    if (!count) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Stock count not found." } });
      return;
    }

    if (count.status !== "in_progress" && count.status !== "draft") {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Counts can only be updated when in progress." } });
      return;
    }

    if (items && Array.isArray(items)) {
      for (const inputItem of items) {
        const match = count.items.find((item: any) => item.item.toString() === inputItem.item.toString());
        if (match) {
          const counted = Math.max(0, parseFloat(inputItem.countedQty));
          match.countedQty = counted;
          match.variance = counted - match.systemQty;
          if (inputItem.notes !== undefined) match.notes = inputItem.notes;
        }
      }
    }

    await count.save();
    res.status(200).json({ success: true, data: count });
  } catch (error) {
    next(error);
  }
});

// POST /api/stock-counts/:id/complete (Freeze & Complete physical count sheet)
router.post("/:id/complete", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const count = await StockCount.findOne({ _id: id, isDeleted: false });
    if (!count) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Stock count not found." } });
      return;
    }
    if (count.status !== "in_progress") {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Only in-progress audits can be marked complete." } });
      return;
    }

    count.status = "completed";
    count.completedAt = new Date();
    await count.save();

    res.status(200).json({ success: true, data: count, message: "Stock count completed, awaiting approval." });
  } catch (error) {
    next(error);
  }
});

// POST /api/stock-counts/:id/approve (Supervisor Approves -> Corrects Stock Levels & logs Movements)
router.post("/:id/approve", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "User header missing." } });
      return;
    }

    const count = await StockCount.findOne({ _id: id, isDeleted: false }).session(session);
    if (!count) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Stock count not found." } });
      return;
    }
    if (count.status !== "completed") {
      throw new Error("Only completed stock counts can be approved.");
    }

    // Process adjustments for items with variance
    for (const item of count.items) {
      if (item.variance !== 0) {
        let stock = await Stock.findOne({ item: item.item, warehouse: count.warehouse }).session(session);
        if (!stock) {
          // Create stock if it somehow didn't exist
          stock = new Stock({
            item: item.item,
            warehouse: count.warehouse,
            quantityOnHand: 0,
            quantityReserved: 0,
            averageCost: 0,
          });
        }

        // Apply variance adjustment directly
        stock.quantityOnHand += item.variance;
        stock.lastCountDate = new Date();
        stock.lastMovement = new Date();
        await stock.save({ session });

        // Log StockMovement
        const movement = new StockMovement({
          item: item.item,
          warehouse: count.warehouse,
          type: "ADJUSTMENT",
          quantity: item.variance,
          referenceType: "ADJUSTMENT",
          referenceId: count._id,
          performedBy: new mongoose.Types.ObjectId(userId),
          notes: item.notes || `Stock count deviation adjustment (${count.stockCountNumber})`,
        });
        await movement.save({ session });
      }
    }

    count.status = "approved";
    count.approvedBy = new mongoose.Types.ObjectId(userId);
    await count.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: count, message: "Stock count approved and adjustments applied." });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: error.message || "Approval failed." } });
  }
});

export default router;
