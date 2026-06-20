import { Router, Request, Response, NextFunction } from "express";
import Organization from "../models/Organization.model.js";
import Setting from "../models/Setting.model.js";

const router = Router();

// GET /api/settings/organization
router.get("/organization", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let org = await Organization.findOne();
    if (!org) {
      // Create a default organization settings if none exists
      org = await Organization.create({
        name: "Industrial Solutions Inc.",
        address: {
          line1: "100 Industrial Parkway",
          line2: "Sector 4",
          city: "Jamshedpur",
          state: "Jharkhand",
          country: "India",
          pincode: "831001",
        },
        gstin: "20AAAAA0000A1Z0",
        pan: "AAAAA0000A",
        phone: "+91-657-220011",
        email: "info@industrialsolutions.com",
        currency: "INR",
        fiscalYearStart: 4, // April
      });
    }

    res.status(200).json({
      success: true,
      data: org,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/settings/organization
router.patch("/organization", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let org = await Organization.findOne();
    if (!org) {
      org = new Organization(req.body);
    } else {
      Object.assign(org, req.body);
    }
    await org.save();

    res.status(200).json({
      success: true,
      data: org,
    });
  } catch (error) {
    next(error);
  }
});

const defaultNumbering = {
  items: { prefix: "ITM-", separator: "", digits: 5, includeYear: true },
  purchaseOrders: { prefix: "PO-", separator: "-", digits: 5, includeYear: true },
  grn: { prefix: "GRN-", separator: "-", digits: 5, includeYear: true },
  issueVouchers: { prefix: "IV-", separator: "-", digits: 5, includeYear: true },
  transfers: { prefix: "TRF-", separator: "-", digits: 5, includeYear: true },
  vendors: { prefix: "VND-", separator: "-", digits: 3, includeYear: false },
  warehouses: { prefix: "WH-", separator: "-", digits: 2, includeYear: false }
};

// GET /api/settings/numbering
router.get("/numbering", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let setting = await Setting.findOne({ key: "numbering" });
    if (!setting) {
      setting = await Setting.create({
        key: "numbering",
        value: defaultNumbering,
        group: "general",
        description: "Auto-number format configurations",
      });
    }

    res.status(200).json({
      success: true,
      data: setting.value,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/settings/numbering
router.patch("/numbering", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let setting = await Setting.findOne({ key: "numbering" });
    if (!setting) {
      setting = new Setting({
        key: "numbering",
        value: req.body,
        group: "general",
        description: "Auto-number format configurations",
      });
    } else {
      setting.value = { ...defaultNumbering, ...setting.value, ...req.body };
      setting.markModified("value");
    }
    await setting.save();

    res.status(200).json({
      success: true,
      data: setting.value,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
