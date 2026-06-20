import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

const MONGODB_URI = process.env.MONGODB_URI;
const API_URL = "http://localhost:5005/api";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined.");
  process.exit(1);
}

import Unit from "../src/models/Unit.model.js";
import Category from "../src/models/Category.model.js";
import Warehouse from "../src/models/Warehouse.model.js";
import Vendor from "../src/models/Vendor.model.js";
import Department from "../src/models/Department.model.js";
import Item from "../src/models/Item.model.js";
import Stock from "../src/models/Stock.model.js";
import StockMovement from "../src/models/StockMovement.model.js";
import PurchaseOrder from "../src/models/PurchaseOrder.model.js";
import GRN from "../src/models/GRN.model.js";
import IssueVoucher from "../src/models/IssueVoucher.model.js";
import ItemReturn from "../src/models/ItemReturn.model.js";
import User from "../src/models/User.model.js";

const getModels = async () => {
  await mongoose.connect(MONGODB_URI);
  return {
    Unit,
    Category,
    Warehouse,
    Vendor,
    Department,
    Item,
    Stock,
    StockMovement,
    PurchaseOrder,
    GRN,
    IssueVoucher,
    ItemReturn,
    User,
  };
};

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Assertion Passed: ${message}`);
  }
}

async function main() {
  console.log("Starting automated workflow verification...");
  const models = await getModels();
  
  // Clean up any stale test records from previous run first
  await models.Vendor.deleteOne({ code: "VND-TEST" });
  await models.Item.deleteOne({ name: "Verification Steel Rods" });

  // Find or create test entities
  console.log("Preparing test entities...");
  
  let unit = await models.Unit.findOne({ symbol: "pcs" });
  if (!unit) {
    unit = await models.Unit.create({ name: "Pieces", symbol: "pcs", type: "count" });
  }
  
  let category = await models.Category.findOne({ slug: "raw-materials" });
  if (!category) {
    category = await models.Category.create({ name: "Raw Materials", slug: "raw-materials" });
  }
  
  let warehouse = await models.Warehouse.findOne({ code: "WH-01" });
  if (!warehouse) {
    warehouse = await models.Warehouse.create({ code: "WH-01", name: "Main Warehouse", isActive: true });
  }
  
  // Create vendor with correct schema properties
  let vendor = await models.Vendor.create({
    code: "VND-TEST",
    name: "Apex Supplies Ltd",
    type: "distributor",
    contact: {
      email: "contact@apex.com",
      phone: "1234567890",
    },
    isActive: true,
    isDeleted: false
  });
  
  let department = await models.Department.findOne({ code: "ELEC" });
  if (!department) {
    department = await models.Department.create({ name: "Electrical", code: "ELEC" });
  }
  
  let user = await models.User.findOne({ email: "admin@company.com" });
  
  // Create Test Item
  let item = await models.Item.findOne({ name: "Verification Steel Rods" });
  if (!item) {
    item = await models.Item.create({
      name: "Verification Steel Rods",
      category: category._id,
      unit: unit._id,
      costPrice: 150,
      minStockLevel: 5,
      isActive: true,
    });
  }
  
  console.log("Test entities ready:");
  console.log(`- Item ID: ${item._id} (SKU: ${item.sku})`);
  console.log(`- Warehouse ID: ${warehouse._id}`);
  console.log(`- Vendor ID: ${vendor._id}`);
  console.log(`- Department ID: ${department._id}`);

  // Fetch current stock
  let stock = await models.Stock.findOne({ item: item._id, warehouse: warehouse._id });
  console.log(`Initial stock level: ${stock ? stock.quantityOnHand : 0} pcs`);

  // ==========================================
  // FLOW 1: CREATE AND SEND PURCHASE ORDER
  // ==========================================
  console.log("\n[Flow 1] Creating Purchase Order via HTTP...");
  const poRes = await fetch(`${API_URL}/purchase-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vendor: vendor._id,
      warehouse: warehouse._id,
      items: [{
        item: item._id,
        quantity: 10,
        unitCost: 150,
        gstRate: 18,
        discountPct: 0
      }]
    })
  });
  
  const poJson = await poRes.json() as any;
  if (!poRes.ok || !poJson.success) {
    console.error("PO Creation Status:", poRes.status);
    console.error("PO Creation JSON Response:", JSON.stringify(poJson, null, 2));
  }
  assert(poRes.ok && poJson.success, "PO creation API succeeded");
  const poId = poJson.data._id;
  const poNumber = poJson.data.poNumber;
  console.log(`Created PO: ${poNumber} (${poId})`);
  
  // Send PO
  const sendPO = await fetch(`${API_URL}/purchase-orders/${poId}/send`, { method: "POST" });
  const sendPOJson = await sendPO.json() as any;
  assert(sendPO.ok && sendPOJson.success && sendPOJson.data.status === "sent", "PO send API succeeded");
  console.log(`PO status updated to sent.`);

  // ==========================================
  // FLOW 2: CREATE AND CONFIRM GOODS RECEIPT NOTE (GRN)
  // ==========================================
  console.log("\n[Flow 2] Creating Goods Receipt Note via HTTP...");
  const grnRes = await fetch(`${API_URL}/grn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      po: poId,
      vendor: vendor._id,
      warehouse: warehouse._id,
      referenceDocument: "CHALLAN-9988",
      items: [{
        item: item._id,
        expectedQty: 10,
        receivedQty: 10,
        acceptedQty: 9,
        rejectedQty: 1,
        rejectionReason: "Slight rust on 1 unit",
        unitCost: 150
      }],
      notes: "Verification GRN note"
    })
  });
  
  const grnJson = await grnRes.json() as any;
  assert(grnRes.ok && grnJson.success, "GRN creation API succeeded");
  const grnId = grnJson.data._id;
  console.log(`Created draft GRN ID: ${grnId}`);
  
  // Confirm GRN
  console.log("Confirming GRN via HTTP...");
  const confirmRes = await fetch(`${API_URL}/grn/${grnId}/confirm`, { method: "POST" });
  const confirmJson = await confirmRes.json() as any;
  assert(confirmRes.ok && confirmJson.success, "GRN confirmation API succeeded");
  console.log("GRN confirmed successfully.");

  // ==========================================
  // FLOW 3: VERIFY STOCK INCREMENT & PO STATUS
  // ==========================================
  console.log("\n[Flow 3] Verifying stock updates in Database...");
  const updatedStock = await models.Stock.findOne({ item: item._id, warehouse: warehouse._id });
  assert(updatedStock && updatedStock.quantityOnHand === (stock ? stock.quantityOnHand : 0) + 9, "StockOnHand increased by accepted quantity (+9)");
  assert(updatedStock && updatedStock.averageCost === 150, "Stock averageCost is correctly 150");
  
  const grnMovement = await models.StockMovement.findOne({ referenceId: grnId, type: "IN" });
  assert(grnMovement && grnMovement.quantity === 9, "StockMovement record created for +9 units");

  const updatedPO = await models.PurchaseOrder.findById(poId);
  assert(updatedPO && updatedPO.status === "partial", "PO status updated to 'partial' (9 of 10 received)");

  // ==========================================
  // FLOW 4: STOREKEEPER MATERIAL ISSUANCE (IMMEDIATE CHECKOUT)
  // ==========================================
  console.log("\n[Flow 4] Creating Storekeeper Material Issue Voucher via HTTP...");
  const issueRes = await fetch(`${API_URL}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      warehouse: warehouse._id,
      requester: {
        name: "Suresh Kumar",
        employeeId: "EMP-405",
        department: department._id,
      },
      approver: {
        name: "Ramesh Sharma",
        designation: "Site Supervisor",
        slipReference: "SLIP-ELECT-2026"
      },
      items: [{
        item: item._id,
        quantity: 4,
        unit: "pcs"
      }],
      notes: "Verification issuance",
      createdBy: user?._id
    })
  });

  const issueJson = await issueRes.json() as any;
  assert(issueRes.ok && issueJson.success, "Issue Voucher creation API succeeded");
  const issueId = issueJson.data._id;
  const ivNumber = issueJson.data.ivNumber;
  console.log(`Created Issue Voucher: ${ivNumber} (${issueId})`);

  // Verify stock deduction
  const postIssueStock = await models.Stock.findOne({ item: item._id, warehouse: warehouse._id });
  assert(postIssueStock && postIssueStock.quantityOnHand === updatedStock.quantityOnHand - 4, "StockOnHand decreased by issued quantity (-4)");
  
  const issueMovement = await models.StockMovement.findOne({ referenceId: issueId, type: "OUT" });
  assert(issueMovement && issueMovement.quantity === 4, "StockMovement record created for -4 units");

  // ==========================================
  // FLOW 5: STOREKEEPER MATERIAL RETURNS
  // ==========================================
  console.log("\n[Flow 5] Testing material return desk via HTTP...");
  
  // Return 2 items under 'good' condition
  const returnRes = await fetch(`${API_URL}/returns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      issueVoucherId: issueId,
      receivedBy: user?._id,
      items: [{
        issueLineId: issueJson.data.items[0]._id,
        item: item._id,
        returnedQty: 2,
        condition: "good",
        notes: "Unused steel rods in perfect condition"
      }],
      remarks: "Verification return step 1"
    })
  });

  const returnJson = await returnRes.json() as any;
  if (!returnRes.ok || !returnJson.success) {
    console.error("Return API Status:", returnRes.status);
    console.error("Return API JSON Response:", JSON.stringify(returnJson, null, 2));
    console.error("Used user ID (receivedBy):", user?._id);
  }
  assert(returnRes.ok && returnJson.success, "Item Return API succeeded");
  const returnId = returnJson.data._id;
  console.log(`Processed Return: ${returnJson.data.returnNumber} (${returnId})`);

  // Verify stock incremented by returned qty
  const postReturnStock = await models.Stock.findOne({ item: item._id, warehouse: warehouse._id });
  assert(postReturnStock && postReturnStock.quantityOnHand === postIssueStock.quantityOnHand + 2, "StockOnHand increased by returned quantity (+2)");

  const returnMovement = await models.StockMovement.findOne({ referenceId: returnId, type: "IN" });
  assert(returnMovement && returnMovement.quantity === 2, "StockMovement record created for +2 units returned");

  // Verify issue voucher is updated to 'partial_return'
  const updatedVoucher = await models.IssueVoucher.findById(issueId);
  assert(updatedVoucher && updatedVoucher.status === "partial_return", "Issue Voucher status updated to 'partial_return'");
  assert(updatedVoucher && updatedVoucher.items[0].returnedQty === 2, "Voucher line returnedQty updated to 2");

  // Return the remaining 2 items (1 good, 1 damaged)
  console.log("Testing remaining return (1 good, 1 damaged)...");
  const returnRes2 = await fetch(`${API_URL}/returns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      issueVoucherId: issueId,
      receivedBy: user?._id,
      items: [{
        issueLineId: issueJson.data.items[0]._id,
        item: item._id,
        returnedQty: 2, // returning the final 2
        condition: "damaged", // damaged condition should NOT add back to stock
        notes: "Damaged during work"
      }],
      remarks: "Verification return step 2"
    })
  });

  const returnJson2 = await returnRes2.json() as any;
  if (!returnRes2.ok || !returnJson2.success) {
    console.error("Second Return API Status:", returnRes2.status);
    console.error("Second Return API JSON Response:", JSON.stringify(returnJson2, null, 2));
  }
  assert(returnRes2.ok && returnJson2.success, "Second Item Return API succeeded");
  console.log(`Processed second Return: ${returnJson2.data.returnNumber}`);

  // Verify stock NOT incremented because of damaged condition
  const postReturnStock2 = await models.Stock.findOne({ item: item._id, warehouse: warehouse._id });
  assert(postReturnStock2 && postReturnStock2.quantityOnHand === postReturnStock.quantityOnHand, "StockOnHand remained same since condition is 'damaged'");

  // Verify issue voucher status is now 'fully_returned'
  const finalVoucher = await models.IssueVoucher.findById(issueId);
  assert(finalVoucher && finalVoucher.status === "fully_returned", "Issue Voucher status updated to 'fully_returned'");
  assert(finalVoucher && finalVoucher.items[0].returnedQty === 4, "Voucher line returnedQty updated to 4 (all 4 returned)");

  console.log("\n========================================================");
  console.log("🎉 ALL VERIFICATION FLOW TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("========================================================");
  
  // Clean up verification document modifications
  console.log("Cleaning up test documents...");
  await models.ItemReturn.deleteMany({ issueVoucher: issueId });
  await models.IssueVoucher.deleteOne({ _id: issueId });
  await models.GRN.deleteOne({ _id: grnId });
  await models.PurchaseOrder.deleteOne({ _id: poId });
  await models.StockMovement.deleteMany({ referenceId: { $in: [grnId, issueId, returnId, returnJson2.data._id] } });
  
  // Restore stock to initial state
  if (stock) {
    await models.Stock.updateOne({ _id: stock._id }, { quantityOnHand: stock.quantityOnHand });
  } else {
    await models.Stock.deleteOne({ item: item._id, warehouse: warehouse._id });
  }

  await mongoose.disconnect();
  console.log("Database disconnected. Done.");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
