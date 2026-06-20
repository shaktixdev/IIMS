import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import IssueVoucher from "../models/IssueVoucher.model.js";
import Department from "../models/Department.model.js";
import Stock from "../models/Stock.model.js";
import StockMovement from "../models/StockMovement.model.js";
import Item from "../models/Item.model.js";
import Batch from "../models/Batch.model.js";
import SerialNumber from "../models/SerialNumber.model.js";
import { checkLowStockAndCreateAlert } from "../services/alert.service.js";

const router = Router();

// GET /api/issues
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    const department = (req.query.department as string) || "";

    const match: any = { isDeleted: false };
    if (status) match.status = status;
    if (search) {
      match.$or = [
        { ivNumber: { $regex: search, $options: "i" } },
        { "requester.name": { $regex: search, $options: "i" } }
      ];
    }
    if (department) match["requester.department"] = new mongoose.Types.ObjectId(department);

    const total = await IssueVoucher.countDocuments(match);
    const issues = await IssueVoucher.find(match)
      .populate("warehouse", "name")
      .populate("requester.department", "name code")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: issues,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/issues/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid Issue Voucher ID" } });
      return;
    }

    const issue = await IssueVoucher.findOne({ _id: id, isDeleted: false })
      .populate("warehouse", "name code")
      .populate("requester.department", "name code")
      .populate("items.item", "name sku barcode isBatchTracked isSerialTracked hasExpiry")
      .populate("items.batches.batchId", "batchNumber expiryDate")
      .populate("items.serialNumbers", "serialNumber status")
      .populate("createdBy", "name")
      .populate({
        path: "returns",
        populate: [
          {
            path: "receivedBy",
            select: "name"
          },
          {
            path: "items.item",
            select: "name sku"
          },
          {
            path: "items.serialNumbers",
            select: "serialNumber status"
          }
        ]
      });

    if (!issue) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Issue Voucher not found." } });
      return;
    }

    res.status(200).json({ success: true, data: issue });
  } catch (error) {
    next(error);
  }
});

// POST /api/issues (Create and Issue Immediately)
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { warehouse, requester, approver, items, notes, createdBy } = req.body;

    if (!warehouse || !requester || !requester.name || !requester.department || !approver || !approver.name || !approver.designation || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing required voucher details." } });
      return;
    }

    // 1. Resolve department name for caching
    let departmentName = "";
    if (mongoose.Types.ObjectId.isValid(requester.department)) {
      const dept = await Department.findById(requester.department).session(session);
      if (dept) {
        departmentName = dept.name;
      }
    } else if (requester.departmentOther) {
      departmentName = requester.departmentOther;
    }

    // 2. Validate stock availability for all items
    for (const line of items) {
      const stock = await Stock.findOne({ item: line.item, warehouse }).session(session);
      const available = stock ? stock.quantityOnHand - stock.quantityReserved : 0;
      if (available < line.quantity) {
        res.status(400).json({
          success: false,
          error: {
            code: "STOCK_INSUFFICIENT",
            message: `Insufficient stock in warehouse for selected item. Available: ${available}, Requested: ${line.quantity}`,
          },
        });
        await session.abortTransaction();
        session.endSession();
        return;
      }
    }

    // 3. Create the IssueVoucher
    const issueVoucher = new IssueVoucher({
      warehouse,
      requester: {
        name: requester.name,
        employeeId: requester.employeeId || "",
        department: mongoose.Types.ObjectId.isValid(requester.department) ? requester.department : undefined,
        departmentOther: requester.departmentOther || "",
        departmentName,
      },
      approver: {
        name: approver.name,
        designation: approver.designation,
        slipReference: approver.slipReference || "",
      },
      status: "issued", // Issued immediately since approval is offline
      items: items.map(line => ({
        item: line.item,
        requestedQty: line.quantity,
        issuedQty: line.quantity,
        returnedQty: 0,
        batches: line.batch ? [{ batchId: new mongoose.Types.ObjectId(line.batch), quantity: line.quantity }] : [],
        serialNumbers: line.serialNumbers ? line.serialNumbers.map((s: string) => new mongoose.Types.ObjectId(s)) : [],
      })),
      notes: notes || "",
      createdBy: createdBy || undefined,
      issueDate: new Date(),
    });

    await issueVoucher.save({ session });

    // 4. Deduct stock & create StockMovement log for each item
    for (const line of items) {
      let batchDoc: any = null;
      if (line.batch) {
        batchDoc = await Batch.findById(line.batch).session(session);
        if (batchDoc) {
          if (batchDoc.currentQuantity < line.quantity) {
            throw new Error(`Insufficient quantity in selected batch. Available: ${batchDoc.currentQuantity}, Requested: ${line.quantity}`);
          }
          batchDoc.currentQuantity -= line.quantity;
          await batchDoc.save({ session });
        }
      }

      if (line.serialNumbers && Array.isArray(line.serialNumbers)) {
        for (const snId of line.serialNumbers) {
          const snDoc = await SerialNumber.findById(snId).session(session);
          if (snDoc) {
            if (snDoc.status !== "AVAILABLE") {
              throw new Error(`Serial number ${snDoc.serialNumber} is not available for issue.`);
            }
            snDoc.status = "ISSUED";
            await snDoc.save({ session });
          }
        }
      }

      const stock = await Stock.findOne({ item: line.item, warehouse }).session(session);
      if (stock) {
        stock.quantityOnHand -= line.quantity;
        stock.lastMovement = new Date();
        await stock.save({ session });
      }

      const movement = new StockMovement({
        item: line.item,
        warehouse,
        type: "OUT",
        quantity: line.quantity,
        referenceType: "ISSUE",
        referenceId: issueVoucher._id,
        batch: batchDoc ? batchDoc._id : undefined
      });
      await movement.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    // Trigger low stock level validation checks
    for (const line of items) {
      checkLowStockAndCreateAlert(line.item, warehouse).catch((err) =>
        console.error("[Alert Trigger] Error checking low stock level for item:", err)
      );
    }

    res.status(201).json({ success: true, data: issueVoucher, message: "Issue Voucher created and items issued successfully." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

export default router;
