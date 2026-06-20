import mongoose from "mongoose";
import Vendor from "../models/Vendor.model.js";
import PurchaseOrder from "../models/PurchaseOrder.model.js";
import GRN from "../models/GRN.model.js";

export interface VendorPerformance {
  totalPOs: number;
  totalValue: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  onTimeRate: number; // percentage
  qualityAcceptance: number; // percentage of accepted vs received items
  rejectionRate: number; // percentage of rejected vs received items
  avgLeadTimeDays: number;
  avgOrderValue: number;
  rating: number;
}

/**
 * Calculates complete performance metrics for a vendor.
 * Aggregates data from both PurchaseOrder and GRN models.
 */
export async function getVendorPerformance(vendorId: string): Promise<VendorPerformance> {
  const vendorObjId = new mongoose.Types.ObjectId(vendorId);

  // 1. Fetch vendor rating
  const vendor = await Vendor.findById(vendorId).select("rating");
  const currentRating = vendor?.rating || 0;

  // 2. Aggregate PO stats (Total orders, Value, Average Order Value, On-time and Late deliveries)
  const [poAgg] = await PurchaseOrder.aggregate([
    { $match: { vendor: vendorObjId, isDeleted: false } },
    {
      $group: {
        _id: null,
        totalPOs: { $sum: 1 },
        totalValue: { $sum: "$grandTotal" },
        onTime: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ["$status", ["received", "closed"]] },
                  { $ne: ["$deliveryDate", null] },
                  { $lte: ["$receivedAt", "$deliveryDate"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        late: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ["$status", ["received", "closed"]] },
                  { $ne: ["$deliveryDate", null] },
                  { $gt: ["$receivedAt", "$deliveryDate"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        avgOrderValue: { $avg: "$grandTotal" },
      },
    },
  ]);

  const totalPOs = poAgg?.totalPOs || 0;
  const totalValue = poAgg?.totalValue || 0;
  const onTime = poAgg?.onTime || 0;
  const late = poAgg?.late || 0;
  const delivered = onTime + late;
  const onTimeRate = delivered > 0 ? Math.round((onTime / delivered) * 100) : 0;
  const avgOrderValue = poAgg?.avgOrderValue ? parseFloat(poAgg.avgOrderValue.toFixed(2)) : 0;

  // 3. Aggregate GRN stats (Quality acceptance, rejection rate, and lead time)
  const grns = await GRN.find({ vendor: vendorObjId, status: "completed" }).populate({
    path: "po",
    select: "createdAt",
  }).lean();

  let totalReceivedQty = 0;
  let totalAcceptedQty = 0;
  let totalRejectedQty = 0;
  let leadTimeSumDays = 0;
  let grnsWithLeadTime = 0;

  for (const grn of grns) {
    // Quality calculations
    for (const item of grn.items) {
      totalReceivedQty += item.receivedQty || 0;
      totalAcceptedQty += item.acceptedQty || 0;
      totalRejectedQty += item.rejectedQty || 0;
    }

    // Lead time calculation (GRN receivedDate - PO createdAt)
    if (grn.receivedDate && (grn.po as any)?.createdAt) {
      const diffMs = new Date(grn.receivedDate).getTime() - new Date((grn.po as any).createdAt).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      leadTimeSumDays += Math.max(0, diffDays);
      grnsWithLeadTime++;
    }
  }

  const qualityAcceptance = totalReceivedQty > 0 ? Math.round((totalAcceptedQty / totalReceivedQty) * 100) : 100;
  const rejectionRate = totalReceivedQty > 0 ? Math.round((totalRejectedQty / totalReceivedQty) * 100) : 0;
  const avgLeadTimeDays = grnsWithLeadTime > 0 ? parseFloat((leadTimeSumDays / grnsWithLeadTime).toFixed(1)) : 0;

  return {
    totalPOs,
    totalValue: parseFloat(totalValue.toFixed(2)),
    onTimeDeliveries: onTime,
    lateDeliveries: late,
    onTimeRate,
    qualityAcceptance,
    rejectionRate,
    avgLeadTimeDays,
    avgOrderValue,
    rating: currentRating,
  };
}

/**
 * Returns paginated PO list for a vendor.
 */
export async function getVendorPOs(vendorId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const total = await PurchaseOrder.countDocuments({ vendor: vendorId, isDeleted: false });
  const pos = await PurchaseOrder.find({ vendor: vendorId, isDeleted: false })
    .populate("warehouse", "code name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    data: pos,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}
