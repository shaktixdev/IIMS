import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined.");
  process.exit(1);
}

import Unit from "../src/models/Unit.model.js";
import Category from "../src/models/Category.model.js";
import Warehouse from "../src/models/Warehouse.model.js";
import Vendor from "../src/models/Vendor.model.js";
import Item from "../src/models/Item.model.js";
import Stock from "../src/models/Stock.model.js";
import PurchaseOrder from "../src/models/PurchaseOrder.model.js";
import Batch from "../src/models/Batch.model.js";
import Alert from "../src/models/Alert.model.js";

import { checkOverduePOs, checkBatchExpiries, checkLowStockLevels } from "../src/queue/jobs/check-po-overdue.js";

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Assertion Passed: ${message}`);
  }
}

async function main() {
  console.log("Connecting to Database for Phase 7 Verification...");
  await mongoose.connect(MONGODB_URI!);

  // Clean up any stale verification records
  console.log("Cleaning up stale verification records...");
  await Alert.deleteMany({ title: /Verification/ });
  await PurchaseOrder.deleteMany({ referenceNumber: "VERIFY-PO-7" });
  await Batch.deleteMany({ batchNumber: "VERIFY-BATCH-7" });
  await Item.deleteMany({ name: /Verification/ });
  await Vendor.deleteMany({ code: "VND-VERIFY-7" });

  console.log("Preparing test structures...");
  
  // Find/create category and unit
  let category = await Category.findOne({ slug: "raw-materials" });
  if (!category) {
    category = await Category.create({ name: "Raw Materials", slug: "raw-materials" });
  }

  let unit = await Unit.findOne({ symbol: "pcs" });
  if (!unit) {
    unit = await Unit.create({ name: "Pieces", symbol: "pcs", type: "count" });
  }

  let warehouse = await Warehouse.findOne({ code: "WH-01" });
  if (!warehouse) {
    warehouse = await Warehouse.create({ code: "WH-01", name: "Main Warehouse", isActive: true });
  }

  // 1. Create a Vendor
  const vendor = await Vendor.create({
    code: "VND-VERIFY-7",
    name: "Verification Vendor",
    type: "distributor",
    contact: { email: "verify@vendor.com", phone: "9876543210" },
    isActive: true,
  });

  // 2. Create a Low Stock Item
  const lowStockItem = await Item.create({
    name: "Verification Low Stock Item",
    category: category._id,
    unit: unit._id,
    costPrice: 200,
    minStockLevel: 25, // Min stock level = 25
    isActive: true,
  });

  // Ensure stock is 5 (which is below 25)
  await Stock.updateOne(
    { item: lowStockItem._id, warehouse: warehouse._id },
    { quantityOnHand: 5, averageCost: 200 },
    { upsert: true }
  );

  // 3. Create an Overdue Purchase Order
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const overduePO = await PurchaseOrder.create({
    vendor: vendor._id,
    warehouse: warehouse._id,
    status: "sent",
    deliveryDate: yesterday,
    referenceNumber: "VERIFY-PO-7",
    items: [
      {
        item: lowStockItem._id,
        itemName: lowStockItem.name,
        itemSku: lowStockItem.sku,
        quantity: 50,
        receivedQty: 0,
        unit: unit._id,
        unitCost: 200,
        gstRate: 18,
        discountPct: 0,
        subtotal: 10000,
        discountAmount: 0,
        gstAmount: 1800,
        netAmount: 11800,
      },
    ],
    subTotal: 10000,
    totalDiscount: 0,
    totalGst: 1800,
    grandTotal: 11800,
  });

  // 4. Create an expiring Batch
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const expiringBatch = await Batch.create({
    batchNumber: "VERIFY-BATCH-7",
    item: lowStockItem._id,
    warehouse: warehouse._id,
    manufactureDate: yesterday,
    expiryDate: fiveDaysFromNow,
    initialQuantity: 10,
    currentQuantity: 10,
    status: "ACTIVE",
  });

  console.log("\nSetup complete. Running alert generators...");

  // ==========================================
  // RUN SCAN 1: OVERDUE PURCHASE ORDERS
  // ==========================================
  console.log("\n[Scan 1] Running checkOverduePOs...");
  await checkOverduePOs();

  const poAlert = await Alert.findOne({
    type: "po_overdue",
    referenceId: overduePO._id,
  });
  assert(poAlert, "Alert for overdue PO was successfully generated");
  assert(poAlert?.severity === "warning", "Overdue PO alert has 'warning' severity");
  assert(poAlert?.title.includes(overduePO.poNumber), "Alert title includes the PO Number");

  // ==========================================
  // RUN SCAN 2: BATCH EXPIRIES
  // ==========================================
  console.log("\n[Scan 2] Running checkBatchExpiries...");
  await checkBatchExpiries();

  const expiryAlert = await Alert.findOne({
    type: "expiry_warning",
    referenceId: expiringBatch._id,
  });
  assert(expiryAlert, "Alert for expiring batch was successfully generated");
  assert(expiryAlert?.severity === "critical", "Expiry warning alert has 'critical' severity (less than 7 days left)");
  assert(expiryAlert?.title.includes(expiringBatch.batchNumber), "Alert title includes the batch number");

  // ==========================================
  // RUN SCAN 3: LOW STOCK SCAN
  // ==========================================
  console.log("\n[Scan 3] Running checkLowStockLevels...");
  await checkLowStockLevels();

  const stockAlert = await Alert.findOne({
    type: "low_stock",
    item: lowStockItem._id,
  });
  assert(stockAlert, "Alert for low stock item was successfully generated");
  assert(stockAlert?.severity === "critical", "Low stock alert has 'critical' severity");
  assert(stockAlert?.message.includes("Verification Low Stock Item"), "Alert message contains item name");

  // ==========================================
  // CLEAN UP
  // ==========================================
  console.log("\nCleaning up verification records...");
  await Alert.deleteMany({ title: /Verification/ });
  await PurchaseOrder.deleteOne({ _id: overduePO._id });
  await Batch.deleteOne({ _id: expiringBatch._id });
  await Item.deleteOne({ _id: lowStockItem._id });
  await Stock.deleteOne({ item: lowStockItem._id, warehouse: warehouse._id });
  await Vendor.deleteOne({ _id: vendor._id });

  await mongoose.disconnect();
  console.log("\n🎉 ALL PHASE 7 BACKEND WORKFLOW TESTS PASSED SUCCESSFULLY! 🎉");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
