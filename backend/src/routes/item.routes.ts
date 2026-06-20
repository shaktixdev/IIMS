import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Item from "../models/Item.model.js";
import Stock from "../models/Stock.model.js";
import Category from "../models/Category.model.js";
import Unit from "../models/Unit.model.js";
import Warehouse from "../models/Warehouse.model.js";
import Batch from "../models/Batch.model.js";
import SerialNumber from "../models/SerialNumber.model.js";
import { computeFuzzyScore } from "../utils/search.js";

const router = Router();

// Simple CSV parser helper
function parseCSV(csvText: string) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0) return [];
  
  // Parse headers and normalize to camelCase or lowercase keys
  const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
  
  const results: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ""));
    
    if (values.length < headers.length) continue;
    
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index];
    });
    results.push(obj);
  }
  return results;
}

// GET /api/items (List with search, filters, pagination)
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const category = (req.query.category as string) || "";
    const warehouse = (req.query.warehouse as string) || "";
    const status = (req.query.status as string) || "all";
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : true;

    // 1. Build initial match stage
    const matchStage: any = {
      isDeleted: false,
      isActive
    };

    if (search) {
      const regexMatches = await Item.find({
        isDeleted: false,
        isActive,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
          { barcode: { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } },
          { model: { $regex: search, $options: "i" } }
        ]
      }, "_id");

      if (regexMatches.length > 0) {
        matchStage._id = { $in: regexMatches.map(m => m._id) };
      } else {
        const allItems = await Item.find({ isDeleted: false, isActive }, "_id sku name barcode brand model").lean();
        const scored = allItems.map((itm: any) => {
          const skuScore = computeFuzzyScore(search, itm.sku || "");
          const nameScore = computeFuzzyScore(search, itm.name || "");
          const barcodeScore = computeFuzzyScore(search, itm.barcode || "");
          const brandScore = computeFuzzyScore(search, itm.brand || "");
          const modelScore = computeFuzzyScore(search, itm.model || "");
          const score = Math.max(skuScore, nameScore, barcodeScore, brandScore, modelScore);
          return { _id: itm._id, score };
        });

        const fuzzyMatches = scored
          .filter(s => s.score >= 0.40)
          .sort((a, b) => b.score - a.score)
          .slice(0, 50);

        matchStage._id = { $in: fuzzyMatches.map(m => m._id) };
      }
    }

    if (category) {
      // Find subcategories of this category to include them too
      const subCats = await Category.find({ parent: new mongoose.Types.ObjectId(category) });
      const catIds = [new mongoose.Types.ObjectId(category), ...subCats.map(c => c._id)];
      matchStage.category = { $in: catIds };
    }

    // 2. Lookup stages
    const lookupStockStage: any = {
      $lookup: {
        from: "stocks",
        let: { itemId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$item", "$$itemId"] },
                  ...(warehouse ? [{ $eq: ["$warehouse", new mongoose.Types.ObjectId(warehouse)] }] : [])
                ]
              }
            }
          }
        ],
        as: "stockDocs"
      }
    };

    const lookupCategoryStage = {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDoc"
      }
    };

    const lookupUnitStage = {
      $lookup: {
        from: "units",
        localField: "unit",
        foreignField: "_id",
        as: "unitDoc"
      }
    };

    // 3. Projection stage to sum quantities
    const projectStage = {
      $project: {
        sku: 1,
        name: 1,
        description: 1,
        category: "$categoryDoc",
        unit: "$unitDoc",
        costPrice: 1,
        minStockLevel: 1,
        maxStockLevel: 1,
        reorderQty: 1,
        barcode: 1,
        hsnCode: 1,
        partNumber: 1,
        brand: 1,
        model: 1,
        isBatchTracked: 1,
        isSerialTracked: 1,
        hasExpiry: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        totalOnHand: { $sum: "$stockDocs.quantityOnHand" },
        totalReserved: { $sum: "$stockDocs.quantityReserved" },
        totalOnOrder: { $sum: "$stockDocs.quantityOnOrder" },
        totalInTransit: { $sum: "$stockDocs.quantityInTransit" }
      }
    };

    // 4. Add derived virtual quantityAvailable
    const addFieldsStage = {
      $addFields: {
        totalAvailable: { $subtract: ["$totalOnHand", "$totalReserved"] }
      }
    };

    // 5. Build match stage for status
    const statusMatchStage: any = {};
    if (status === "out_of_stock") {
      statusMatchStage.totalOnHand = 0;
    } else if (status === "low_stock") {
      statusMatchStage.$expr = { $lt: ["$totalOnHand", "$minStockLevel"] };
    } else if (status === "in_stock") {
      statusMatchStage.totalOnHand = { $gt: 0 };
      statusMatchStage.$expr = { $gte: ["$totalOnHand", "$minStockLevel"] };
    }

    // 6. Build final pipeline
    const pipeline: any[] = [
      { $match: matchStage },
      lookupStockStage,
      lookupCategoryStage,
      { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
      lookupUnitStage,
      { $unwind: { path: "$unitDoc", preserveNullAndEmptyArrays: true } },
      projectStage,
      addFieldsStage
    ];

    if (Object.keys(statusMatchStage).length > 0) {
      pipeline.push({ $match: statusMatchStage });
    }

    // Clone pipeline for count
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Item.aggregate(countPipeline);
    const totalItems = countResult[0]?.total || 0;

    // Add sort and pagination
    pipeline.push({ $sort: { [sortBy]: sortOrder } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const items = await Item.aggregate(pipeline);

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total: totalItems,
        page,
        limit,
        pages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/items/search (Fast SKU/name/barcode search)
router.get("/search", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = (req.query.q as string) || "";
    if (!query) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    let items = await Item.find({
      isDeleted: false,
      isActive: true,
      $or: [
        { sku: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
        { barcode: { $regex: query, $options: "i" } }
      ]
    })
      .populate("category", "name")
      .populate("unit", "name symbol")
      .limit(10);

    if (items.length === 0) {
      const allItems = await Item.find({ isDeleted: false, isActive: true }, "_id sku name barcode brand model").lean();
      const scored = allItems.map((itm: any) => {
        const skuScore = computeFuzzyScore(query, itm.sku || "");
        const nameScore = computeFuzzyScore(query, itm.name || "");
        const barcodeScore = computeFuzzyScore(query, itm.barcode || "");
        const brandScore = computeFuzzyScore(query, itm.brand || "");
        const modelScore = computeFuzzyScore(query, itm.model || "");
        const score = Math.max(skuScore, nameScore, barcodeScore, brandScore, modelScore);
        return { _id: itm._id, score };
      });

      const fuzzyMatches = scored
        .filter(s => s.score >= 0.40)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      if (fuzzyMatches.length > 0) {
        const matchedIds = fuzzyMatches.map(m => m._id);
        const fetchedItems = await Item.find({ _id: { $in: matchedIds } })
          .populate("category", "name")
          .populate("unit", "name symbol");

        const scoreMap = new Map(fuzzyMatches.map(m => [m._id.toString(), m.score]));
        items = fetchedItems.sort((a: any, b: any) => {
          const scoreA = scoreMap.get(a._id.toString()) || 0;
          const scoreB = scoreMap.get(b._id.toString()) || 0;
          return scoreB - scoreA;
        });
      }
    }

    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/items/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid item ID format." } });
      return;
    }

    const item = await Item.findOne({ _id: id, isDeleted: false })
      .populate("category")
      .populate("unit")
      .populate("purchaseUnit")
      .populate("weightUnit");

    if (!item) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Item not found." }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/items
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name,
      description,
      category,
      subcategory,
      unit,
      purchaseUnit,
      conversionFactor,
      costPrice,
      minStockLevel,
      maxStockLevel,
      reorderQty,
      leadTimeDays,
      weight,
      weightUnit,
      dimensions,
      barcode,
      hsnCode,
      partNumber,
      brand,
      model,
      isBatchTracked,
      isSerialTracked,
      hasExpiry,
      expiryAlertDays,
      attributes,
      preferredVendors
    } = req.body;

    if (!name || !category || !unit) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Name, Category, and Unit of Measure are required fields." }
      });
      return;
    }

    // Verify Category exists
    const catExists = await Category.findById(category);
    if (!catExists) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Category does not exist." } });
      return;
    }

    // Verify Unit exists
    const unitExists = await Unit.findById(unit);
    if (!unitExists) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Unit does not exist." } });
      return;
    }

    // Validate custom dynamic attributes if required by Category
    if (catExists.attributes && catExists.attributes.length > 0) {
      const itemAttributes = attributes || {};
      for (const attr of catExists.attributes) {
        if (attr.required && (itemAttributes[attr.name] === undefined || itemAttributes[attr.name] === null || itemAttributes[attr.name] === "")) {
          res.status(400).json({
            success: false,
            error: { code: "VALIDATION_ERROR", message: `Category attribute '${attr.name}' is required.` }
          });
          return;
        }
      }
    }

    const item = new Item({
      name,
      description: description || "",
      category,
      subcategory: subcategory || undefined,
      unit,
      purchaseUnit: purchaseUnit || undefined,
      conversionFactor: conversionFactor !== undefined ? conversionFactor : 1,
      costPrice: costPrice !== undefined ? costPrice : 0,
      minStockLevel: minStockLevel !== undefined ? minStockLevel : 0,
      maxStockLevel: maxStockLevel !== undefined ? maxStockLevel : 0,
      reorderQty: reorderQty !== undefined ? reorderQty : 0,
      leadTimeDays: leadTimeDays !== undefined ? leadTimeDays : 0,
      weight: weight !== undefined ? weight : 0,
      weightUnit: weightUnit || undefined,
      dimensions: dimensions || {},
      barcode: barcode || "",
      hsnCode: hsnCode || "",
      partNumber: partNumber || "",
      brand: brand || "",
      model: model || "",
      isBatchTracked: !!isBatchTracked,
      isSerialTracked: !!isSerialTracked,
      hasExpiry: !!hasExpiry,
      expiryAlertDays: expiryAlertDays !== undefined ? expiryAlertDays : 30,
      attributes: attributes || {},
      preferredVendors: preferredVendors || [],
    });

    await item.save();

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/items/bulk (Bulk Edit/Update)
router.patch("/bulk", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "An array of 'ids' is required." } });
      return;
    }
    if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Updates object is required and cannot be empty." } });
      return;
    }

    const allowedFields = [
      "category", "subcategory", "unit", "purchaseUnit", "conversionFactor", 
      "costPrice", "minStockLevel", "maxStockLevel", "reorderQty", "leadTimeDays", 
      "brand", "model", "isBatchTracked", "isSerialTracked", "hasExpiry", "isActive"
    ];

    const finalUpdates: any = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        finalUpdates[field] = updates[field];
      }
    });

    if (Object.keys(finalUpdates).length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "No valid fields provided for update." } });
      return;
    }

    if (finalUpdates.category) {
      if (!mongoose.Types.ObjectId.isValid(finalUpdates.category)) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid category ID format." } });
        return;
      }
      const catExists = await Category.findById(finalUpdates.category);
      if (!catExists) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Category does not exist." } });
        return;
      }
    }

    if (finalUpdates.unit) {
      if (!mongoose.Types.ObjectId.isValid(finalUpdates.unit)) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid unit ID format." } });
        return;
      }
      const unitExists = await Unit.findById(finalUpdates.unit);
      if (!unitExists) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Unit does not exist." } });
        return;
      }
    }

    const result = await Item.updateMany(
      { _id: { $in: ids }, isDeleted: false },
      { $set: finalUpdates }
    );

    res.status(200).json({
      success: true,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/items/:id
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid item ID format." } });
      return;
    }

    const item = await Item.findOne({ _id: id, isDeleted: false });
    if (!item) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Item not found." } });
      return;
    }

    const updateableFields = [
      "name", "description", "category", "subcategory", "unit", "purchaseUnit",
      "conversionFactor", "costPrice", "minStockLevel", "maxStockLevel", "reorderQty",
      "leadTimeDays", "weight", "weightUnit", "dimensions", "barcode", "hsnCode",
      "partNumber", "brand", "model", "isBatchTracked", "isSerialTracked",
      "hasExpiry", "expiryAlertDays", "attributes", "preferredVendors", "isActive"
    ];

    updateableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        item[field] = req.body[field];
      }
    });

    await item.save();

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/items/bulk (Bulk Soft Delete/Archive)
router.delete("/bulk", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "An array of 'ids' is required for bulk archiving." } });
      return;
    }

    const result = await Item.updateMany(
      { _id: { $in: ids }, isDeleted: false },
      { 
        $set: { 
          isDeleted: true, 
          isActive: false, 
          deletedAt: new Date() 
        } 
      }
    );

    res.status(200).json({
      success: true,
      message: `Successfully archived ${result.modifiedCount} items.`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/items/:id (Soft delete)
router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid item ID format." } });
      return;
    }

    const item = await Item.findOne({ _id: id, isDeleted: false });
    if (!item) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Item not found." } });
      return;
    }

    item.isDeleted = true;
    item.isActive = false;
    item.deletedAt = new Date();
    await item.save();

    res.status(200).json({
      success: true,
      message: "Item soft-deleted successfully."
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/items/:id/stock (Stock breakdown across warehouses)
router.get("/:id/stock", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid item ID format." } });
      return;
    }

    // Ensure item exists
    const itemExists = await Item.findOne({ _id: id, isDeleted: false });
    if (!itemExists) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Item not found." } });
      return;
    }

    // Get stock records
    const stockRecords = await Stock.find({ item: id }).populate("warehouse", "code name type");

    res.status(200).json({
      success: true,
      data: stockRecords
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/items/:id/stock/adjust (Direct Stock Adjustment for testing/corrections)
router.post("/:id/stock/adjust", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { warehouseId, newQuantity, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid item ID format." } });
      return;
    }

    if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid or missing warehouse ID." } });
      return;
    }

    if (newQuantity === undefined || typeof newQuantity !== "number" || newQuantity < 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "New quantity must be a non-negative number." } });
      return;
    }

    // Ensure item exists
    const item = await Item.findOne({ _id: id, isDeleted: false });
    if (!item) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Item not found." } });
      return;
    }

    // Get or initialize stock record
    let stock = await Stock.findOne({ item: id, warehouse: warehouseId });
    if (!stock) {
      stock = new Stock({
        item: id,
        warehouse: warehouseId,
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityOnOrder: 0,
        quantityInTransit: 0,
        averageCost: item.costPrice || 0,
        totalValue: 0
      });
    }

    const previousQty = stock.quantityOnHand;
    const delta = newQuantity - previousQty;

    stock.quantityOnHand = newQuantity;
    stock.totalValue = newQuantity * (stock.averageCost || item.costPrice || 0);
    await stock.save();

    // Log StockMovement if there is a change
    if (delta !== 0) {
      const StockMovement = mongoose.model("StockMovement");
      const movement = new StockMovement({
        item: id,
        warehouse: warehouseId,
        type: "ADJUSTMENT",
        quantity: delta,
        referenceType: "ADJUSTMENT",
        notes: notes || "Direct stock balance adjustment",
        date: new Date()
      });
      await movement.save();
    }

    res.status(200).json({
      success: true,
      message: "Stock balance adjusted successfully.",
      data: stock
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/items/:id/movements (Stock movement history for an item)
router.get("/:id/movements", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid item ID format." } });
      return;
    }

    // Verify item exists
    const itemExists = await Item.findOne({ _id: id, isDeleted: false });
    if (!itemExists) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Item not found." } });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type as string | undefined;
    const warehouseId = req.query.warehouse as string | undefined;

    const matchStage: any = { item: new mongoose.Types.ObjectId(id) };
    if (type && ["IN", "OUT", "ADJUSTMENT", "TRANSFER"].includes(type)) {
      matchStage.type = type;
    }
    if (warehouseId && mongoose.Types.ObjectId.isValid(warehouseId)) {
      matchStage.warehouse = new mongoose.Types.ObjectId(warehouseId);
    }

    const StockMovement = mongoose.model("StockMovement");

    const [movements, total] = await Promise.all([
      StockMovement.find(matchStage)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate("warehouse", "code name")
        .populate("performedBy", "name email")
        .lean(),
      StockMovement.countDocuments(matchStage),
    ]);

    res.status(200).json({
      success: true,
      data: movements,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/items/import (Bulk CSV Upload)
router.post("/import", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { csvText } = req.body;
    if (!csvText) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "CSV content is required in 'csvText' body parameter." } });
      return;
    }

    const parsedRows = parseCSV(csvText);
    if (parsedRows.length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "CSV content is empty or invalid." } });
      return;
    }

    let successCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Pre-load categories and units for faster lookup
    const allCategories = await Category.find();
    const allUnits = await Unit.find();
    const activeWarehouses = await Warehouse.find({ isActive: true });

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const rowNum = i + 2; // Row number in spreadsheet (1-indexed header + 1-indexed content)

      try {
        if (!row.name) {
          errors.push({ row: rowNum, error: "Missing required column: name" });
          continue;
        }

        if (!row.category) {
          errors.push({ row: rowNum, error: "Missing required column: category" });
          continue;
        }

        if (!row.unit) {
          errors.push({ row: rowNum, error: "Missing required column: unit" });
          continue;
        }

        // Match Category by slug or name (case-insensitive)
        const cat = allCategories.find(c =>
          c.slug === row.category.toLowerCase().trim() ||
          c.name.toLowerCase() === row.category.toLowerCase().trim()
        );
        if (!cat) {
          errors.push({ row: rowNum, error: `Category '${row.category}' not found.` });
          continue;
        }

        // Match Unit by symbol or name
        const ut = allUnits.find(u =>
          u.symbol.toLowerCase() === row.unit.toLowerCase().trim() ||
          u.name.toLowerCase() === row.unit.toLowerCase().trim()
        );
        if (!ut) {
          errors.push({ row: rowNum, error: `Unit '${row.unit}' not found.` });
          continue;
        }

        const costVal = parseFloat(row.costprice) || parseFloat(row.cost_price) || 0;
        const minStockVal = parseFloat(row.minstocklevel) || parseFloat(row.min_stock) || 0;
        const maxStockVal = parseFloat(row.maxstocklevel) || parseFloat(row.max_stock) || 0;
        const reorderQtyVal = parseFloat(row.reorderqty) || parseFloat(row.reorder_qty) || 0;

        const item = new Item({
          name: row.name.trim(),
          description: row.description || "",
          category: cat._id,
          unit: ut._id,
          costPrice: costVal,
          minStockLevel: minStockVal,
          maxStockLevel: maxStockVal,
          reorderQty: reorderQtyVal,
          barcode: row.barcode || "",
          hsnCode: row.hsncode || row.hsn_code || "",
          brand: row.brand || "",
          model: row.model || "",
          isBatchTracked: row.isbatchtracked === "true" || row.batch === "true",
          isSerialTracked: row.isserialtracked === "true" || row.serial === "true",
          hasExpiry: row.hasexpiry === "true" || row.expiry === "true",
        });

        await item.save();

        // Parse stock count
        let stockQty = 0;
        const rawStock = row.availablestock || row.availableStock || row.stockcount || row.stockCount || row.quantityonhand || row.quantityOnHand || row.initialstock || row.initialStock || row.stock_count || row.quantity_on_hand;
        if (rawStock !== undefined && rawStock !== "") {
          const parsed = parseFloat(rawStock);
          if (!isNaN(parsed) && parsed >= 0) {
            stockQty = parsed;
          }
        }

        // Determine warehouse
        let targetWarehouseId = null;
        const rawWh = row.warehouse || row.warehousecode || row.warehouseCode || row.warehouse_code;
        if (rawWh) {
          const wh = activeWarehouses.find(w => 
            w.code.toLowerCase() === rawWh.toLowerCase().trim() ||
            w.name.toLowerCase() === rawWh.toLowerCase().trim()
          );
          if (wh) {
            targetWarehouseId = wh._id;
          }
        }
        
        // Default to first active warehouse if not specified/found
        if (!targetWarehouseId && activeWarehouses.length > 0) {
          targetWarehouseId = activeWarehouses[0]._id;
        }

        // Update the stock record that was initialized by the post-save hook
        if (stockQty > 0 && targetWarehouseId) {
          await Stock.findOneAndUpdate(
            { item: item._id, warehouse: targetWarehouseId },
            { 
              $set: { 
                quantityOnHand: stockQty,
                totalValue: stockQty * costVal 
              }
            }
          );

          // Log StockMovement
          const StockMovement = mongoose.model("StockMovement");
          const movement = new StockMovement({
            item: item._id,
            warehouse: targetWarehouseId,
            type: "IN",
            quantity: stockQty,
            referenceType: "INITIAL",
            notes: "Initial inventory loaded via bulk import",
            date: new Date(),
          });
          await movement.save();
        }

        successCount++;
      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message || "Failed to save item." });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        successCount,
        failedCount: errors.length,
        errors
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/items/:id/batches (Fetch active batches of an item)
router.get("/:id/batches", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { warehouse } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid item ID format." } });
      return;
    }
    const query: any = { item: id, currentQuantity: { $gt: 0 } };
    if (warehouse && mongoose.Types.ObjectId.isValid(warehouse as string)) {
      query.warehouse = warehouse;
    }
    const batches = await Batch.find(query).sort({ expiryDate: 1, createdAt: 1 }).lean();
    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
});

// GET /api/items/:id/serial-numbers (Fetch available serial numbers of an item)
router.get("/:id/serial-numbers", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { warehouse } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid item ID format." } });
      return;
    }
    const query: any = { item: id, status: "AVAILABLE" };
    if (warehouse && mongoose.Types.ObjectId.isValid(warehouse as string)) {
      query.warehouse = warehouse;
    }
    const serials = await SerialNumber.find(query).sort({ serialNumber: 1 }).lean();
    res.status(200).json({ success: true, data: serials });
  } catch (error) {
    next(error);
  }
});

export default router;
