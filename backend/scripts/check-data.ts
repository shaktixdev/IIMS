import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

async function check() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found");
    return;
  }
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const collections = ["users", "items", "stocks", "categories", "vendors", "purchaseorders", "issuevouchers", "itemreturns", "warehouses"];
  for (const c of collections) {
    try {
      const count = await mongoose.connection.db.collection(c).countDocuments();
      console.log(`Collection: ${c} - Count: ${count}`);
    } catch (e) {
      console.log(`Collection: ${c} - Not found or error`);
    }
  }

  // Print first few items if any
  const items = await mongoose.connection.db.collection("items").find({}).limit(3).toArray();
  console.log("Items:", JSON.stringify(items, null, 2));

  // Print first few POs if any
  const pos = await mongoose.connection.db.collection("purchaseorders").find({}).limit(2).toArray();
  console.log("POs:", JSON.stringify(pos, null, 2));

  // Print first few Issues if any
  const issues = await mongoose.connection.db.collection("issuevouchers").find({}).limit(2).toArray();
  console.log("Issues:", JSON.stringify(issues, null, 2));

  await mongoose.disconnect();
}

check().catch(console.error);
