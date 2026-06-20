import mongoose from "mongoose";
import PurchaseOrder, { computeLineItem, computePOTotals, IPOLineItem } from "../models/PurchaseOrder.model.js";
import Vendor from "../models/Vendor.model.js";
import Warehouse from "../models/Warehouse.model.js";
import Item from "../models/Item.model.js";
import Stock from "../models/Stock.model.js";

/**
 * Validates and constructs detailed line items for a PO.
 * Snapshots Item name, SKU, and unit, and calculates line costs.
 */
export async function buildLineItems(rawItems: any[]): Promise<IPOLineItem[]> {
  const items: IPOLineItem[] = [];

  for (const raw of rawItems) {
    if (!raw.item) {
      throw new Error("Each line item must have an item reference.");
    }
    if (!mongoose.Types.ObjectId.isValid(raw.item)) {
      throw new Error(`Invalid item ID: ${raw.item}`);
    }

    const qty = parseFloat(raw.quantity);
    const cost = parseFloat(raw.unitCost);
    const gst = parseFloat(raw.gstRate ?? "18");
    const disc = parseFloat(raw.discountPct ?? "0");

    if (isNaN(qty) || qty <= 0) {
      throw new Error("Quantity must be > 0 for each line item.");
    }
    if (isNaN(cost) || cost < 0) {
      throw new Error("Unit cost cannot be negative.");
    }

    const calcs = computeLineItem(qty, cost, gst, disc);

    // Fetch and snapshot item details
    const itemDoc = await Item.findById(raw.item).select("name sku unit").lean() as any;
    if (!itemDoc) {
      throw new Error(`Item not found for ID: ${raw.item}`);
    }

    items.push({
      item: new mongoose.Types.ObjectId(raw.item),
      itemName: itemDoc.name || "",
      itemSku: itemDoc.sku || "",
      quantity: qty,
      receivedQty: 0,
      unit: itemDoc.unit || undefined,
      unitCost: cost,
      gstRate: gst,
      discountPct: disc,
      ...calcs,
    } as IPOLineItem);
  }

  return items;
}

/**
 * Approve a Purchase Order.
 * Sets the approvedBy field and logs approval.
 */
export async function approvePO(poId: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(poId)) {
    throw new Error("Invalid PO ID format.");
  }

  const po = await PurchaseOrder.findOne({ _id: poId, isDeleted: false });
  if (!po) {
    throw new Error("Purchase order not found.");
  }

  if (po.status !== "draft") {
    throw new Error(`Only draft POs can be approved. Current status: ${po.status}`);
  }

  po.approvedBy = new mongoose.Types.ObjectId(userId);
  await po.save();

  await po.populate([
    { path: "vendor", select: "code name type" },
    { path: "warehouse", select: "code name" },
    { path: "approvedBy", select: "name email" },
  ]);

  return po;
}

/**
 * Mark a Purchase Order as sent to the vendor.
 * Verifies that the PO has been approved before transitioning.
 */
export async function sendPO(poId: string) {
  if (!mongoose.Types.ObjectId.isValid(poId)) {
    throw new Error("Invalid PO ID format.");
  }

  const po = await PurchaseOrder.findOne({ _id: poId, isDeleted: false });
  if (!po) {
    throw new Error("Purchase order not found.");
  }

  if (po.status !== "draft") {
    throw new Error(`Cannot send a PO in '${po.status}' status. Must be 'draft'.`);
  }

  // Enforce manual approval rule before dispatching
  if (!po.approvedBy) {
    throw new Error("This Purchase Order must be approved by a manager before it can be sent.");
  }

  po.status = "sent";
  po.sentAt = new Date();
  await po.save();

  return po;
}

/**
 * Scan all inventory items and automatically compile draft POs for
 * low stock levels. Groups items by vendor and target warehouse.
 */
export async function autoGeneratePOs(warehouseId?: string) {
  // 1. Fetch low stock records (available qty < minStockLevel)
  const matchWarehouse: any = {};
  if (warehouseId) {
    matchWarehouse.warehouse = new mongoose.Types.ObjectId(warehouseId);
  }

  const stocks = await Stock.find(warehouseId ? matchWarehouse : {}).lean();

  // 2. Fetch all active items with reorder triggers
  const itemsForReorder = await Item.find({
    isDeleted: false,
    isActive: true,
    "preferredVendors.0": { $exists: true },
    reorderQty: { $gt: 0 },
  }).lean();

  // 3. Map items below threshold to their preferred vendors & warehouses
  const vendorItemMap: Map<
    string,
    { item: any; reorderQty: number; warehouse: mongoose.Types.ObjectId }[]
  > = new Map();

  for (const item of itemsForReorder) {
    const vendorId = String((item.preferredVendors as any[])[0]);
    if (!vendorId) continue;

    // Find stock matching item and optional warehouse
    const itemStocks = stocks.filter((s) => String(s.item) === String(item._id));
    if (itemStocks.length === 0) continue;

    for (const stock of itemStocks) {
      const available = stock.quantityOnHand - stock.quantityReserved;
      if (available >= item.minStockLevel) continue; // Stock is sufficient

      if (!vendorItemMap.has(vendorId)) {
        vendorItemMap.set(vendorId, []);
      }

      vendorItemMap.get(vendorId)!.push({
        item,
        reorderQty: item.reorderQty || 0,
        warehouse: stock.warehouse,
      });
    }
  }

  if (vendorItemMap.size === 0) {
    return { createdPOs: 0, pos: [] };
  }

  const createdPOs: any[] = [];

  for (const [vendorId, vendorItems] of vendorItemMap.entries()) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) continue;

    // Group items for this vendor by target warehouse
    const warehouseMap: Map<string, typeof vendorItems> = new Map();
    for (const vi of vendorItems) {
      const wKey = String(vi.warehouse);
      if (!warehouseMap.has(wKey)) {
        warehouseMap.set(wKey, []);
      }
      warehouseMap.get(wKey)!.push(vi);
    }

    for (const [whId, whItems] of warehouseMap.entries()) {
      const lineItems = whItems.map((vi) => ({
        item: vi.item._id,
        quantity: vi.reorderQty,
        unitCost: vi.item.lastPurchasePrice || vi.item.costPrice || 0,
        gstRate: 18,
        discountPct: 0,
      }));

      // Use buildLineItems logic
      const processedLines = await buildLineItems(lineItems);
      const totals = computePOTotals(processedLines);

      const po = new PurchaseOrder({
        vendor: new mongoose.Types.ObjectId(vendorId),
        warehouse: new mongoose.Types.ObjectId(whId),
        items: processedLines,
        ...totals,
        internalNotes: "Auto-generated draft PO from low-stock trigger.",
      });

      await po.save();
      createdPOs.push({
        _id: po._id,
        poNumber: po.poNumber,
        vendor: vendor.name,
        itemsCount: processedLines.length,
        grandTotal: totals.grandTotal,
      });
    }
  }

  return {
    createdPOs: createdPOs.length,
    pos: createdPOs,
  };
}
