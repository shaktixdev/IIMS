import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Item from "../src/models/Item.model.js";
import Stock from "../src/models/Stock.model.js";
import Category from "../src/models/Category.model.js";
import Unit from "../src/models/Unit.model.js";
import Warehouse from "../src/models/Warehouse.model.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not defined!");
  process.exit(1);
}

async function runTests() {
  console.log("==================================================");
  console.log("Starting Phase 3 Schema and Seeding Verification Tests");
  console.log("==================================================");

  console.log("Connecting to MongoDB database...");
  await mongoose.connect(MONGODB_URI!);
  console.log("✓ MongoDB Connected.");

  try {
    // 1. Fetch category and unit to link
    const category = await Category.findOne({ slug: "metals" });
    const unit = await Unit.findOne({ symbol: "pcs" });
    const warehouses = await Warehouse.find({ isActive: true });

    if (!category || !unit) {
      throw new Error("Seed categories/units are missing! Please run npm run seed first.");
    }

    console.log("Test 1: Creating a test item and asserting SKU generation...");
    const testItem = new Item({
      name: "Verification Plate 5mm",
      description: "Integration testing plate",
      category: category._id,
      unit: unit._id,
      costPrice: 250,
      minStockLevel: 5,
      maxStockLevel: 50,
      isBatchTracked: false,
      isSerialTracked: false,
      hasExpiry: false,
      attributes: {
        "Grade": "316",
        "Thickness (mm)": 5
      }
    });

    await testItem.save();
    console.log(`✓ Test item created successfully. SKU: ${testItem.sku}`);
    if (!testItem.sku.startsWith("ITM-")) {
      throw new Error(`SKU generation format is invalid. Generated: ${testItem.sku}`);
    }

    console.log("Test 2: Verifying Stock records initialization for active warehouses...");
    const stocks = await Stock.find({ item: testItem._id });
    console.log(`Found ${stocks.length} stock records. (Active warehouses count: ${warehouses.length})`);
    
    if (stocks.length !== warehouses.length) {
      throw new Error(`Stock record count mismatch. Expected: ${warehouses.length}, Found: ${stocks.length}`);
    }

    for (const stock of stocks) {
      if (stock.quantityOnHand !== 0 || stock.averageCost !== 250) {
        throw new Error(`Stock values incorrect. OnHand: ${stock.quantityOnHand}, AvgCost: ${stock.averageCost}`);
      }
      console.log(`  - Warehouse ${stock.warehouse} initialized to 0 stock, avg cost 250.`);
    }
    console.log("✓ Stock records verified successfully.");

    // Cleanup
    console.log("Cleaning up test data...");
    await Item.deleteOne({ _id: testItem._id });
    await Stock.deleteMany({ item: testItem._id });
    console.log("✓ Cleanup done.");

    console.log("\n==================================================");
    console.log("ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!");
    console.log("==================================================");

  } catch (error) {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed.");
  }
}

runTests();
