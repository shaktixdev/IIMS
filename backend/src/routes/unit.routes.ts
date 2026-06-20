import { Router, Request, Response, NextFunction } from "express";
import Unit from "../models/Unit.model.js";

const router = Router();

// GET /api/units
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const units = await Unit.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/units
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, symbol, type, conversions } = req.body;

    if (!name || !symbol) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Unit name and symbol are required.",
        },
      });
      return;
    }

    const unit = new Unit({
      name,
      symbol,
      type: type || "count",
      conversions: conversions || [],
    });

    await unit.save();

    res.status(201).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/units/:id
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, symbol, type, conversions, isActive } = req.body;

    const unit = await Unit.findById(id);
    if (!unit) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Unit not found.",
        },
      });
      return;
    }

    if (name !== undefined) unit.name = name;
    if (symbol !== undefined) unit.symbol = symbol;
    if (type !== undefined) unit.type = type;
    if (conversions !== undefined) unit.conversions = conversions;
    if (isActive !== undefined) unit.isActive = isActive;

    await unit.save();

    res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
