import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Vendor from "../models/Vendor.model.js";
import PurchaseOrder from "../models/PurchaseOrder.model.js";
import { getVendorPerformance, getVendorPOs } from "../services/vendor.service.js";

const router = Router();

// GET /api/vendors
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const type = (req.query.type as string) || "";
    const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : true;

    const matchStage: any = { isDeleted: false, isActive };

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { gstin: { $regex: search, $options: "i" } },
        { "contact.email": { $regex: search, $options: "i" } },
      ];
    }

    if (type) matchStage.type = type;

    const total = await Vendor.countDocuments(matchStage);

    // Aggregate with PO count per vendor
    const vendors = await Vendor.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "purchaseorders",
          let: { vendorId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$vendor", "$$vendorId"] },
                    { $in: ["$status", ["draft", "sent", "partial"]] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "activePOsAgg",
        },
      },
      {
        $addFields: {
          activePOsCount: { $ifNull: [{ $arrayElemAt: ["$activePOsAgg.count", 0] }, 0] },
        },
      },
      { $project: { activePOsAgg: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    res.status(200).json({
      success: true,
      data: vendors,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/vendors
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, type, contact, address, gstin, pan, paymentTerms, creditDays, bankingDetails, notes } =
      req.body;

    if (!name || !type) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Vendor name and type are required." },
      });
      return;
    }

    const validTypes = ["manufacturer", "distributor", "trader", "service"];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: `Type must be one of: ${validTypes.join(", ")}` },
      });
      return;
    }

    const vendor = new Vendor({
      name: name.trim(),
      type,
      contact: contact || {},
      address: address || {},
      gstin: gstin || "",
      pan: pan || "",
      paymentTerms: paymentTerms || "",
      creditDays: creditDays || 0,
      bankingDetails: bankingDetails || {},
      notes: notes || "",
    });

    await vendor.save();

    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
});

// GET /api/vendors/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid vendor ID." } });
      return;
    }

    const vendor = await Vendor.findOne({ _id: id, isDeleted: false });
    if (!vendor) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Vendor not found." } });
      return;
    }

    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/vendors/:id
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid vendor ID." } });
      return;
    }

    const vendor = await Vendor.findOne({ _id: id, isDeleted: false });
    if (!vendor) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Vendor not found." } });
      return;
    }

    const updatable = [
      "name", "type", "contact", "address", "gstin", "pan",
      "paymentTerms", "creditDays", "bankingDetails", "notes",
      "rating", "isActive", "preferredItems",
    ];

    updatable.forEach((field) => {
      if (req.body[field] !== undefined) {
        (vendor as any)[field] = req.body[field];
      }
    });

    await vendor.save();
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/vendors/:id (soft delete)
router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid vendor ID." } });
      return;
    }

    const vendor = await Vendor.findOne({ _id: id, isDeleted: false });
    if (!vendor) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Vendor not found." } });
      return;
    }

    vendor.isDeleted = true;
    vendor.isActive = false;
    vendor.deletedAt = new Date();
    await vendor.save();

    res.status(200).json({ success: true, message: "Vendor soft-deleted successfully." });
  } catch (error) {
    next(error);
  }
});

// GET /api/vendors/:id/pos — POs linked to vendor
router.get("/:id/pos", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid vendor ID." } });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await getVendorPOs(id, page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/vendors/:id/performance
router.get("/:id/performance", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid vendor ID." } });
      return;
    }

    const performance = await getVendorPerformance(id);

    res.status(200).json({ success: true, data: performance });
  } catch (error) {
    next(error);
  }
});

export default router;
