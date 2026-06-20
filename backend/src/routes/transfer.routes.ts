import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Transfer from "../models/Transfer.model.js";
import { dispatchTransfer, receiveTransfer, cancelTransfer } from "../services/transfer.service.js";

const router = Router();

// GET /api/transfers
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";

    const match: any = { isDeleted: false };
    if (status) match.status = status;
    if (search) {
      match.transferNumber = { $regex: search, $options: "i" };
    }

    const total = await Transfer.countDocuments(match);
    const transfers = await Transfer.find(match)
      .populate("fromWarehouse", "name code")
      .populate("toWarehouse", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: transfers,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/transfers/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid Transfer ID" } });
      return;
    }

    const transfer = await Transfer.findOne({ _id: id, isDeleted: false })
      .populate("fromWarehouse", "name code zones")
      .populate("toWarehouse", "name code zones")
      .populate("items.item", "name sku barcode isBatchTracked isSerialTracked")
      .populate("items.unit", "name symbol")
      .populate("createdBy", "name email")
      .populate("dispatchedBy", "name email")
      .populate("receivedBy", "name email");

    if (!transfer) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Transfer not found." } });
      return;
    }

    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
});

// POST /api/transfers (Create Draft)
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fromWarehouse, toWarehouse, expectedDate, items, notes, vehicleNumber, driverName, driverPhone } = req.body;
    const userId = req.headers["x-user-id"] as string;

    if (!fromWarehouse || !toWarehouse || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields." } });
      return;
    }

    if (fromWarehouse.toString() === toWarehouse.toString()) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Source and destination warehouses must be different." } });
      return;
    }

    const transfer = new Transfer({
      fromWarehouse,
      toWarehouse,
      expectedDate,
      items,
      notes,
      vehicleNumber,
      driverName,
      driverPhone,
      status: "draft",
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await transfer.save();
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/transfers/:id (Update Draft)
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid Transfer ID" } });
      return;
    }

    const transfer = await Transfer.findOne({ _id: id, isDeleted: false });
    if (!transfer) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Transfer not found." } });
      return;
    }
    if (transfer.status !== "draft") {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Only draft transfers can be edited." } });
      return;
    }

    const { items, notes, expectedDate, vehicleNumber, driverName, driverPhone } = req.body;
    if (items) transfer.items = items;
    if (notes !== undefined) transfer.notes = notes;
    if (expectedDate !== undefined) transfer.expectedDate = expectedDate;
    if (vehicleNumber !== undefined) transfer.vehicleNumber = vehicleNumber;
    if (driverName !== undefined) transfer.driverName = driverName;
    if (driverPhone !== undefined) transfer.driverPhone = driverPhone;

    await transfer.save();
    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
});

// POST /api/transfers/:id/dispatch
router.post("/:id/dispatch", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "User header missing." } });
      return;
    }

    const result = await dispatchTransfer(id, userId);
    res.status(200).json({ success: true, data: result, message: "Transfer dispatched successfully." });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: error.message || "Dispatch failed." } });
  }
});

// POST /api/transfers/:id/receive
router.post("/:id/receive", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "User header missing." } });
      return;
    }

    if (!items || !Array.isArray(items)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Received items array is required." } });
      return;
    }

    const result = await receiveTransfer(id, items, userId);
    res.status(200).json({ success: true, data: result, message: "Transfer received successfully." });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: error.message || "Receive failed." } });
  }
});

// POST /api/transfers/:id/cancel
router.post("/:id/cancel", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "User header missing." } });
      return;
    }

    const result = await cancelTransfer(id, userId);
    res.status(200).json({ success: true, data: result, message: "Transfer cancelled successfully." });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: error.message || "Cancellation failed." } });
  }
});

export default router;
