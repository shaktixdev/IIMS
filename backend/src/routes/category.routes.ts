import { Router, Request, Response, NextFunction } from "express";
import Category from "../models/Category.model.js";

const router = Router();

// GET /api/categories
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/categories
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, parent, description, attributes } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Category name is required.",
        },
      });
      return;
    }

    // Check parent exists if provided
    if (parent) {
      const parentExists = await Category.findById(parent);
      if (!parentExists) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Parent category not found.",
          },
        });
        return;
      }
    }

    const category = new Category({
      name,
      parent: parent || null,
      description: description || "",
      attributes: attributes || [],
    });

    await category.save();

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/categories/:id
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, parent, description, attributes, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Category not found.",
        },
      });
      return;
    }

    // Prevent recursive parenting
    if (parent && parent === id) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A category cannot be its own parent.",
        },
      });
      return;
    }

    if (name !== undefined) category.name = name;
    if (parent !== undefined) category.parent = parent || null;
    if (description !== undefined) category.description = description;
    if (attributes !== undefined) category.attributes = attributes;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/categories/:id
router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Category not found.",
        },
      });
      return;
    }

    // Check if category has child categories
    const hasChildren = await Category.findOne({ parent: id });
    if (hasChildren) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Cannot delete category with subcategories. Delete children first.",
        },
      });
      return;
    }

    // Note: In Phase 3, we would check if any Item references this category
    // but we can add it here as a placeholder or mock check.
    // For now, simple deletion is fine as long as there are no child categories.
    await Category.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
