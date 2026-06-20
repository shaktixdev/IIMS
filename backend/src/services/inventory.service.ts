import mongoose from "mongoose";
import Item from "../models/Item.model.js";
import Stock from "../models/Stock.model.js";
import StockMovement from "../models/StockMovement.model.js";
import Category from "../models/Category.model.js";
import Unit from "../models/Unit.model.js";
import Setting from "../models/Setting.model.js";
import Counter from "../models/Counter.model.js";
import Warehouse from "../models/Warehouse.model.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ItemFilters {
  search?: string;
  category?: string;
  warehouse?: string;
  status?: "in_stock" | "low_stock" | "out_of_stock" | "all";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isActive?: boolean;
}

export interface PaginatedItems {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ItemWithStock {
  item: any;
  stock: any[];
  totalOnHand: number;
  totalAvailable: number;
  totalReserved: number;
  totalValue: number;
}

export interface StockUpdateParams {
  itemId: string;
  warehouseId: string;
  quantityDelta: number; // Positive = increase, Negative = decrease
  averageCostUpdate?: number;
  movementType: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
  referenceType: "GRN" | "ISSUE" | "TRANSFER" | "ADJUSTMENT" | "INITIAL" | "RETURN";
  referenceId?: string;
  performedBy?: string;
  notes?: string;
}

export interface ImportResult {
  successCount: number;
  failedCount: number;
  errors: Array<{ row: number; error: string }>;
}

export interface ImportRow {
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  costprice?: string;
  cost_price?: string;
  minstocklevel?: string;
  min_stock?: string;
  maxstocklevel?: string;
  max_stock?: string;
  reorderqty?: string;
  reorder_qty?: string;
  barcode?: string;
  hsncode?: string;
  hsn_code?: string;
  brand?: string;
  model?: string;
  isbatchtracked?: string;
  batch?: string;
  isserialtracked?: string;
  serial?: string;
  hasexpiry?: string;
  expiry?: string;
  [key: string]: string | undefined;
}

// ---------------------------------------------------------------------------
// SKU Generator
// ---------------------------------------------------------------------------
/**
 * Generates a formatted SKU code based on configured numbering settings.
 * @param categoryCode - Optional category code prefix override
 */
export async function generateSKU(categoryCode?: string): Promise<string> {
  try {
    const numbering = await Setting.findOne({ key: "numbering" });
    const config = numbering?.value?.items || {
      prefix: "ITM-",
      separator: "",
      digits: 5,
      includeYear: true,
    };

    const counter = await Counter.findByIdAndUpdate(
      "items",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqNum = String(counter.seq).padStart(config.digits, "0");
    const yearStr = config.includeYear ? String(new Date().getFullYear()) : "";
    const prefix = categoryCode
      ? `${categoryCode}-${yearStr}${config.separator}`
      : `${config.prefix}${yearStr}${config.separator}`;

    return `${prefix}${seqNum}`;
  } catch (err) {
    // Fallback SKU if counter fails
    const ts = Date.now().toString(36).toUpperCase();
    return `ITM-${ts}`;
  }
}

// ---------------------------------------------------------------------------
// Item Search
// ---------------------------------------------------------------------------
/**
 * Performs paginated, filtered item search with stock rollup.
 */
export async function searchItems(
  filters: ItemFilters,
  page: number = 1,
  limit: number = 25
): Promise<PaginatedItems> {
  const skip = (page - 1) * limit;
  const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
  const sortBy = filters.sortBy || "createdAt";

  const matchStage: any = {
    isDeleted: false,
    isActive: filters.isActive !== undefined ? filters.isActive : true,
  };

  if (filters.search) {
    matchStage.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { sku: { $regex: filters.search, $options: "i" } },
      { barcode: { $regex: filters.search, $options: "i" } },
      { brand: { $regex: filters.search, $options: "i" } },
      { model: { $regex: filters.search, $options: "i" } },
    ];
  }

  if (filters.category) {
    const subCats = await Category.find({
      parent: new mongoose.Types.ObjectId(filters.category),
    });
    const catIds = [
      new mongoose.Types.ObjectId(filters.category),
      ...subCats.map((c) => c._id),
    ];
    matchStage.category = { $in: catIds };
  }

  const lookupStock: any = {
    $lookup: {
      from: "stocks",
      let: { itemId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$item", "$$itemId"] },
                ...(filters.warehouse
                  ? [
                      {
                        $eq: [
                          "$warehouse",
                          new mongoose.Types.ObjectId(filters.warehouse),
                        ],
                      },
                    ]
                  : []),
              ],
            },
          },
        },
      ],
      as: "stockDocs",
    },
  };

  const pipeline: any[] = [
    { $match: matchStage },
    lookupStock,
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDoc",
      },
    },
    { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "units",
        localField: "unit",
        foreignField: "_id",
        as: "unitDoc",
      },
    },
    { $unwind: { path: "$unitDoc", preserveNullAndEmptyArrays: true } },
    {
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
        totalInTransit: { $sum: "$stockDocs.quantityInTransit" },
      },
    },
    {
      $addFields: {
        totalAvailable: { $subtract: ["$totalOnHand", "$totalReserved"] },
      },
    },
  ];

  // Status filter
  if (filters.status === "out_of_stock") {
    pipeline.push({ $match: { totalOnHand: 0 } });
  } else if (filters.status === "low_stock") {
    pipeline.push({
      $match: { $expr: { $lt: ["$totalOnHand", "$minStockLevel"] } },
    });
  } else if (filters.status === "in_stock") {
    pipeline.push({
      $match: {
        totalOnHand: { $gt: 0 },
        $expr: { $gte: ["$totalOnHand", "$minStockLevel"] },
      },
    });
  }

  const countPipeline = [...pipeline, { $count: "total" }];
  const countResult = await Item.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  pipeline.push({ $sort: { [sortBy]: sortOrder } });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  const data = await Item.aggregate(pipeline);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

// ---------------------------------------------------------------------------
// Get Item With Stock Breakdown
// ---------------------------------------------------------------------------
/**
 * Fetches an item and its full stock position across all warehouses.
 */
export async function getItemWithStock(itemId: string): Promise<ItemWithStock | null> {
  if (!mongoose.Types.ObjectId.isValid(itemId)) return null;

  const item = await Item.findOne({ _id: itemId, isDeleted: false })
    .populate("category")
    .populate("unit")
    .populate("purchaseUnit")
    .populate("weightUnit")
    .lean();

  if (!item) return null;

  const stock = await Stock.find({ item: itemId })
    .populate("warehouse", "code name type")
    .lean();

  const totalOnHand = stock.reduce((s, r) => s + r.quantityOnHand, 0);
  const totalReserved = stock.reduce((s, r) => s + r.quantityReserved, 0);
  const totalValue = stock.reduce((s, r) => s + r.totalValue, 0);

  return {
    item,
    stock,
    totalOnHand,
    totalAvailable: totalOnHand - totalReserved,
    totalReserved,
    totalValue,
  };
}

// ---------------------------------------------------------------------------
// Update Stock (Atomic)
// ---------------------------------------------------------------------------
/**
 * Atomically updates stock for an item in a warehouse and logs the movement.
 * Uses findOneAndUpdate to avoid race conditions.
 */
export async function updateStock(params: StockUpdateParams): Promise<any> {
  const {
    itemId,
    warehouseId,
    quantityDelta,
    averageCostUpdate,
    movementType,
    referenceType,
    referenceId,
    performedBy,
    notes,
  } = params;

  // Atomically upsert stock document
  const updateOp: any = {
    $inc: { quantityOnHand: quantityDelta },
    $set: { lastMovement: new Date() },
  };

  if (averageCostUpdate !== undefined && averageCostUpdate > 0) {
    // Weighted average cost update is done externally before calling this
    updateOp.$set.averageCost = averageCostUpdate;
  }

  const stockDoc = await Stock.findOneAndUpdate(
    { item: itemId, warehouse: warehouseId },
    updateOp,
    { new: true, upsert: true }
  );

  // Recalculate totalValue after update
  stockDoc.totalValue = stockDoc.quantityOnHand * stockDoc.averageCost;
  await stockDoc.save();

  // Log movement
  const movement = await StockMovement.create({
    item: itemId,
    warehouse: warehouseId,
    type: movementType,
    quantity: quantityDelta,
    referenceType,
    referenceId: referenceId
      ? new mongoose.Types.ObjectId(referenceId)
      : undefined,
    date: new Date(),
    performedBy: performedBy
      ? new mongoose.Types.ObjectId(performedBy)
      : undefined,
    notes: notes || "",
  });

  return { stock: stockDoc, movement };
}

// ---------------------------------------------------------------------------
// Stock Level Queries
// ---------------------------------------------------------------------------
/**
 * Returns stock level for a specific item + warehouse combination.
 */
export async function getStockLevel(
  itemId: string,
  warehouseId: string
): Promise<any | null> {
  return Stock.findOne({ item: itemId, warehouse: warehouseId })
    .populate("warehouse", "code name type")
    .lean();
}

/**
 * Returns all items where total quantityOnHand < minStockLevel.
 */
export async function getLowStockItems(warehouseId?: string): Promise<any[]> {
  const matchWarehouse: any = {};
  if (warehouseId) {
    matchWarehouse.warehouse = new mongoose.Types.ObjectId(warehouseId);
  }

  const pipeline: any[] = [
    { $match: { isDeleted: false, isActive: true } },
    {
      $lookup: {
        from: "stocks",
        localField: "_id",
        foreignField: "item",
        as: "stockDocs",
        ...(warehouseId ? { pipeline: [{ $match: matchWarehouse }] } : {}),
      },
    },
    {
      $addFields: {
        totalOnHand: { $sum: "$stockDocs.quantityOnHand" },
      },
    },
    {
      $match: {
        $expr: {
          $and: [
            { $gt: ["$minStockLevel", 0] },
            { $lt: ["$totalOnHand", "$minStockLevel"] },
          ],
        },
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDoc",
      },
    },
    { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "units",
        localField: "unit",
        foreignField: "_id",
        as: "unitDoc",
      },
    },
    { $unwind: { path: "$unitDoc", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        sku: 1,
        name: 1,
        category: "$categoryDoc.name",
        unit: "$unitDoc.symbol",
        minStockLevel: 1,
        totalOnHand: 1,
        deficit: { $subtract: ["$minStockLevel", "$totalOnHand"] },
      },
    },
    { $sort: { deficit: -1 } },
  ];

  return Item.aggregate(pipeline);
}

/**
 * Returns stock valuation report (total inventory value by item/warehouse).
 */
export async function getStockValuation(warehouseId?: string): Promise<any> {
  const matchStage: any = {};
  if (warehouseId) {
    matchStage.warehouse = new mongoose.Types.ObjectId(warehouseId);
  }

  const pipeline: any[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: "items",
        localField: "item",
        foreignField: "_id",
        as: "itemDoc",
      },
    },
    { $unwind: { path: "$itemDoc", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        "itemDoc.isDeleted": false,
        "itemDoc.isActive": true,
      },
    },
    {
      $lookup: {
        from: "warehouses",
        localField: "warehouse",
        foreignField: "_id",
        as: "warehouseDoc",
      },
    },
    { $unwind: { path: "$warehouseDoc", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$warehouse",
        warehouseName: { $first: "$warehouseDoc.name" },
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: "$quantityOnHand" },
        totalValue: { $sum: "$totalValue" },
      },
    },
    {
      $project: {
        _id: 0,
        warehouse: "$_id",
        warehouseName: 1,
        totalItems: 1,
        totalQuantity: 1,
        totalValue: { $round: ["$totalValue", 2] },
      },
    },
  ];

  const byWarehouse = await Stock.aggregate(pipeline);
  const grandTotal = byWarehouse.reduce((sum, w) => sum + w.totalValue, 0);

  return {
    byWarehouse,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

/**
 * Checks if enough stock is available for an operation.
 */
export async function checkAvailability(
  itemId: string,
  warehouseId: string,
  qty: number
): Promise<boolean> {
  const stock = await Stock.findOne({ item: itemId, warehouse: warehouseId });
  if (!stock) return false;
  const available = stock.quantityOnHand - stock.quantityReserved;
  return available >= qty;
}

// ---------------------------------------------------------------------------
// Bulk Import
// ---------------------------------------------------------------------------
/**
 * Parses and imports items from a CSV row array.
 */
export async function importItems(csvRows: ImportRow[]): Promise<ImportResult> {
  const allCategories = await Category.find().lean();
  const allUnits = await Unit.find().lean();
  const activeWarehouses = await Warehouse.find({ isActive: true }).lean();

  let successCount = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i];
    const rowNum = i + 2;

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

      const cat = allCategories.find(
        (c: any) =>
          c.slug === row.category!.toLowerCase().trim() ||
          c.name.toLowerCase() === row.category!.toLowerCase().trim()
      );
      if (!cat) {
        errors.push({
          row: rowNum,
          error: `Category '${row.category}' not found.`,
        });
        continue;
      }

      const ut = allUnits.find(
        (u: any) =>
          u.symbol.toLowerCase() === row.unit!.toLowerCase().trim() ||
          u.name.toLowerCase() === row.unit!.toLowerCase().trim()
      );
      if (!ut) {
        errors.push({
          row: rowNum,
          error: `Unit '${row.unit}' not found.`,
        });
        continue;
      }

      const costVal = parseFloat(row.costprice || row.cost_price || "0") || 0;

      const item = new Item({
        name: row.name.trim(),
        description: row.description || "",
        category: (cat as any)._id,
        unit: (ut as any)._id,
        costPrice: costVal,
        minStockLevel:
          parseFloat(row.minstocklevel || row.min_stock || "0") || 0,
        maxStockLevel:
          parseFloat(row.maxstocklevel || row.max_stock || "0") || 0,
        reorderQty: parseFloat(row.reorderqty || row.reorder_qty || "0") || 0,
        barcode: row.barcode || "",
        hsnCode: row.hsncode || row.hsn_code || "",
        brand: row.brand || "",
        model: row.model || "",
        isBatchTracked:
          row.isbatchtracked === "true" || row.batch === "true",
        isSerialTracked:
          row.isserialtracked === "true" || row.serial === "true",
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
        const wh = activeWarehouses.find((w: any) => 
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
        await StockMovement.create({
          item: item._id,
          warehouse: targetWarehouseId,
          type: "IN",
          quantity: stockQty,
          referenceType: "INITIAL",
          notes: "Initial inventory loaded via bulk import",
          date: new Date(),
        });
      }

      successCount++;
    } catch (err: any) {
      errors.push({ row: rowNum, error: err.message || "Failed to save item." });
    }
  }

  return {
    successCount,
    failedCount: errors.length,
    errors,
  };
}
