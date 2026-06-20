import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import PurchaseOrder, { computePOTotals } from "../models/PurchaseOrder.model.js";
import Vendor from "../models/Vendor.model.js";
import Warehouse from "../models/Warehouse.model.js";
import { buildLineItems, approvePO, sendPO, autoGeneratePOs } from "../services/po.service.js";

const router = Router();

// GET /api/purchase-orders
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || "";
    const vendor = (req.query.vendor as string) || "";
    const warehouse = (req.query.warehouse as string) || "";
    const search = (req.query.search as string) || "";
    const dateFrom = (req.query.dateFrom as string) || "";
    const dateTo = (req.query.dateTo as string) || "";

    const match: any = { isDeleted: false };

    if (status) match.status = status;
    if (vendor && mongoose.Types.ObjectId.isValid(vendor)) match.vendor = new mongoose.Types.ObjectId(vendor);
    if (warehouse && mongoose.Types.ObjectId.isValid(warehouse)) match.warehouse = new mongoose.Types.ObjectId(warehouse);
    if (search) match.poNumber = { $regex: search, $options: "i" };
    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
      if (dateTo) match.createdAt.$lte = new Date(dateTo);
    }

    const total = await PurchaseOrder.countDocuments(match);

    const pos = await PurchaseOrder.find(match)
      .populate("vendor", "code name type contact rating")
      .populate("warehouse", "code name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Add items count
    const result = pos.map((po: any) => ({ ...po, itemCount: po.items?.length || 0 }));

    res.status(200).json({
      success: true,
      data: result,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/purchase-orders
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { vendor, warehouse, deliveryDate, referenceNumber, paymentTerms, shippingAddress, items, notes, terms, internalNotes } = req.body;

    if (!vendor || !warehouse || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Vendor, warehouse, and at least one line item are required." },
      });
      return;
    }

    // Validate vendor
    const vendorDoc = await Vendor.findOne({ _id: vendor, isDeleted: false });
    if (!vendorDoc) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Vendor does not exist." } });
      return;
    }

    // Validate warehouse
    const warehouseDoc = await Warehouse.findById(warehouse);
    if (!warehouseDoc) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Warehouse does not exist." } });
      return;
    }

    // Build line items using service
    let processedLines;
    try {
      processedLines = await buildLineItems(items);
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: err.message } });
      return;
    }

    const totals = computePOTotals(processedLines);

    const po = new PurchaseOrder({
      vendor,
      warehouse,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      referenceNumber: referenceNumber || "",
      paymentTerms: paymentTerms || "",
      shippingAddress: shippingAddress || {},
      items: processedLines,
      ...totals,
      notes: notes || "",
      terms: terms || "",
      internalNotes: internalNotes || "",
    });

    await po.save();
    await po.populate([
      { path: "vendor", select: "code name type" },
      { path: "warehouse", select: "code name" },
    ]);

    res.status(201).json({ success: true, data: po });
  } catch (error) {
    next(error);
  }
});

// GET /api/purchase-orders/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid PO ID." } });
      return;
    }

    const po = await PurchaseOrder.findOne({ _id: id, isDeleted: false })
      .populate("vendor", "code name type contact address gstin paymentTerms rating")
      .populate("warehouse", "code name address")
      .populate("items.item", "name sku barcode hsnCode isBatchTracked isSerialTracked hasExpiry")
      .populate("items.unit", "name symbol")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email");

    if (!po) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Purchase order not found." } });
      return;
    }

    res.status(200).json({ success: true, data: po });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/purchase-orders/:id (only draft)
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid PO ID." } });
      return;
    }

    const po = await PurchaseOrder.findOne({ _id: id, isDeleted: false });
    if (!po) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Purchase order not found." } });
      return;
    }

    if (po.status !== "draft") {
      res.status(409).json({
        success: false,
        error: { code: "CONFLICT", message: "Only draft POs can be edited. Cancel and recreate to modify a sent PO." },
      });
      return;
    }

    const { vendor, warehouse, deliveryDate, referenceNumber, paymentTerms, shippingAddress, items, notes, terms, internalNotes } = req.body;

    if (vendor) po.vendor = vendor;
    if (warehouse) po.warehouse = warehouse;
    if (deliveryDate !== undefined) po.deliveryDate = deliveryDate ? new Date(deliveryDate) : undefined;
    if (referenceNumber !== undefined) po.referenceNumber = referenceNumber;
    if (paymentTerms !== undefined) po.paymentTerms = paymentTerms;
    if (shippingAddress !== undefined) po.shippingAddress = shippingAddress;
    if (notes !== undefined) po.notes = notes;
    if (terms !== undefined) po.terms = terms;
    if (internalNotes !== undefined) po.internalNotes = internalNotes;

    if (items && Array.isArray(items) && items.length > 0) {
      let processedLines;
      try {
        processedLines = await buildLineItems(items);
      } catch (err: any) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: err.message } });
        return;
      }
      po.items = processedLines as any;
      const totals = computePOTotals(processedLines);
      po.subTotal = totals.subTotal;
      po.totalDiscount = totals.totalDiscount;
      po.totalGst = totals.totalGst;
      po.grandTotal = totals.grandTotal;
    }

    await po.save();
    res.status(200).json({ success: true, data: po });
  } catch (error) {
    next(error);
  }
});

// POST /api/purchase-orders/:id/send — draft → sent
router.post("/:id/send", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const po = await sendPO(id);
    res.status(200).json({ success: true, data: po, message: "PO marked as sent to vendor." });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: error.message } });
    } else if (error.message.includes("must be approved") || error.message.includes("status")) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: error.message } });
    } else {
      next(error);
    }
  }
});

// POST /api/purchase-orders/:id/approve — approve a draft PO
router.post("/:id/approve", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const callerId = req.headers["x-user-id"] as string;
    const callerRole = (req.headers["x-user-role"] as string) || "";

    if (!callerId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "User session required." } });
      return;
    }

    if (!["super_admin", "admin", "manager"].includes(callerRole)) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only managers and admins can approve purchase orders." } });
      return;
    }

    const po = await approvePO(id, callerId);
    res.status(200).json({ success: true, data: po, message: "PO approved successfully." });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: error.message } });
    } else if (error.message.includes("Only draft POs") || error.message.includes("format")) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: error.message } });
    } else {
      next(error);
    }
  }
});

// POST /api/purchase-orders/:id/cancel
router.post("/:id/cancel", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid PO ID." } });
      return;
    }

    const po = await PurchaseOrder.findOne({ _id: id, isDeleted: false });
    if (!po) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Purchase order not found." } });
      return;
    }

    const cancellableStatuses = ["draft", "sent"];
    if (!cancellableStatuses.includes(po.status)) {
      res.status(409).json({ success: false, error: { code: "CONFLICT", message: `Cannot cancel a PO in '${po.status}' status.` } });
      return;
    }

    po.status = "cancelled";
    po.cancelledAt = new Date();
    await po.save();

    res.status(200).json({ success: true, data: po, message: "PO cancelled." });
  } catch (error) {
    next(error);
  }
});

// POST /api/purchase-orders/:id/close
router.post("/:id/close", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid PO ID." } });
      return;
    }

    const po = await PurchaseOrder.findOne({ _id: id, isDeleted: false });
    if (!po) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Purchase order not found." } });
      return;
    }

    if (!["sent", "partial"].includes(po.status)) {
      res.status(409).json({ success: false, error: { code: "CONFLICT", message: `Cannot close a PO in '${po.status}' status.` } });
      return;
    }

    po.status = "closed";
    po.closedAt = new Date();
    await po.save();

    res.status(200).json({ success: true, data: po, message: "PO closed." });
  } catch (error) {
    next(error);
  }
});

// POST /api/purchase-orders/auto — Auto PO generator for low-stock items
router.post("/auto", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { warehouseId } = req.body;
    const result = await autoGeneratePOs(warehouseId);
    res.status(201).json({
      success: true,
      data: result,
      message: `Created ${result.createdPOs} draft PO(s) for reorder.`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
