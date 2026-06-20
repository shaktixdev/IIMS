import mongoose from "mongoose";
import Warehouse from "../models/Warehouse.model.js";
import Stock from "../models/Stock.model.js";
import Transfer from "../models/Transfer.model.js";
import StockMovement from "../models/StockMovement.model.js";

export interface WarehouseStats {
  totalSKUs: number;
  totalQuantity: number;
  totalValue: number;
  pendingTransfers: number;
}

export async function getWarehouseStats(warehouseId: string): Promise<WarehouseStats> {
  const whObjId = new mongoose.Types.ObjectId(warehouseId);

  // Aggregate stock stats for the warehouse
  const [stockAgg] = await Stock.aggregate([
    { $match: { warehouse: whObjId } },
    {
      $group: {
        _id: null,
        totalSKUs: { $sum: { $cond: [{ $gt: ["$quantityOnHand", 0] }, 1, 0] } },
        totalQuantity: { $sum: "$quantityOnHand" },
        totalValue: { $sum: "$totalValue" },
      },
    },
  ]);

  // Count pending transfers (status is 'in_transit' where receiving warehouse is this warehouse)
  const pendingTransfers = await Transfer.countDocuments({
    toWarehouse: whObjId,
    status: "in_transit",
    isDeleted: false,
  });

  return {
    totalSKUs: stockAgg?.totalSKUs || 0,
    totalQuantity: stockAgg?.totalQuantity || 0,
    totalValue: stockAgg?.totalValue ? parseFloat(stockAgg.totalValue.toFixed(2)) : 0,
    pendingTransfers,
  };
}

export async function getWarehouseStock(warehouseId: string) {
  const whObjId = new mongoose.Types.ObjectId(warehouseId);
  const stock = await Stock.find({ warehouse: whObjId })
    .populate("item", "name sku barcode isBatchTracked isSerialTracked")
    .lean();
  return stock.filter((s: any) => s && s.item !== null && s.item !== undefined);
}

export async function getRecentMovements(warehouseId: string, limit: number = 20) {
  const whObjId = new mongoose.Types.ObjectId(warehouseId);
  const movements = await StockMovement.find({ warehouse: whObjId })
    .populate("item", "name sku")
    .populate("performedBy", "name")
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .lean();
  return movements.filter((m: any) => m && m.item !== null && m.item !== undefined);
}
