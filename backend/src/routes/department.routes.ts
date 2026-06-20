import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Department from "../models/Department.model.js";

const router = Router();

// GET /api/departments
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeOnly = req.query.activeOnly !== "false";
    const filter: any = {};
    if (activeOnly) {
      filter.isActive = true;
    }

    const departments = await Department.find(filter).sort({ name: 1 }).lean();
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
});

// POST /api/departments
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, code, head } = req.body;
    if (!name || !code) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Name and Code are required." },
      });
      return;
    }

    const department = new Department({ name, code, head });
    await department.save();
    res.status(201).json({ success: true, data: department });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: { code: "CONFLICT", message: "Department name or code already exists." },
      });
    } else {
      next(error);
    }
  }
});

// PATCH /api/departments/:id
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid department ID" },
      });
      return;
    }

    const { name, code, head, isActive } = req.body;
    const department = await Department.findById(id);
    if (!department) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Department not found." },
      });
      return;
    }

    if (name !== undefined) department.name = name;
    if (code !== undefined) department.code = code;
    if (head !== undefined) department.head = head;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();
    res.status(200).json({ success: true, data: department });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: { code: "CONFLICT", message: "Department name or code already exists." },
      });
    } else {
      next(error);
    }
  }
});

// DELETE /api/departments/:id (Deactivate)
router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid department ID" },
      });
      return;
    }

    const department = await Department.findById(id);
    if (!department) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Department not found." },
      });
      return;
    }

    department.isActive = false;
    await department.save();
    res.status(200).json({ success: true, message: "Department deactivated successfully." });
  } catch (error) {
    next(error);
  }
});

export default router;
