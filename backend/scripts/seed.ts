import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

// Load environment variables with explicit absolute path and override enabled
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

const MONGODB_URI = process.env.MONGODB_URI;

console.log("==================================================");
console.log("Using MongoDB URI:", MONGODB_URI ? MONGODB_URI.replace(/:[^:@]+@/, ":****@") : "undefined");
console.log("==================================================");

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not defined!");
  process.exit(1);
}

// ----------------------------------------------------
// INLINE SCHEMAS FOR SEEDING
// ----------------------------------------------------

// User Schema
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    preferences: {
      theme: { type: String, default: "dark" },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "Asia/Kolkata" },
      notifications: {
        lowStock: { type: Boolean, default: true },
        newPO: { type: Boolean, default: true },
        transfers: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// Organization Schema
const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    logo: { type: String, default: "" },
    address: {
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },
    gstin: { type: String, default: "" },
    pan: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    currency: { type: String, default: "INR" },
    fiscalYearStart: { type: Number, default: 4 },
  },
  { timestamps: true }
);

const Organization = mongoose.models.Organization || mongoose.model("Organization", OrganizationSchema);

// Setting Schema
const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    group: { type: String, required: true },
  },
  { timestamps: true }
);

const Setting = mongoose.models.Setting || mongoose.model("Setting", SettingSchema);

// Warehouse Schema
const ZoneSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  rows: { type: Number, default: 0 },
  columns: { type: Number, default: 0 },
});

const WarehouseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, default: "main" },
    address: {
      line1: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    zones: [ZoneSchema],
  },
  { timestamps: true }
);

const Warehouse = mongoose.models.Warehouse || mongoose.model("Warehouse", WarehouseSchema);

// Unit Schema
const UnitConversionSchema = new mongoose.Schema({
  toUnit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
  factor: { type: Number, required: true },
});

const UnitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    type: { type: String, default: "count" },
    conversions: [UnitConversionSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Unit = mongoose.models.Unit || mongoose.model("Unit", UnitSchema);

// Category Schema
const CategoryAttributeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  options: [{ type: String }],
  required: { type: Boolean, default: false },
  unit: { type: String, default: "" },
});

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    description: { type: String, default: "" },
    attributes: [CategoryAttributeSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);

// Department Schema
const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    head: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Department = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);

// ----------------------------------------------------
// SEEDING FUNCTION
// ----------------------------------------------------

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to database.");

  // 1. Seed Super Admin User
  const adminEmail = "admin@company.com";
  const adminPassword = "admin123";

  console.log(`Checking if super_admin with email ${adminEmail} exists...`);
  let adminUser = await User.findOne({ email: adminEmail });
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  if (adminUser) {
    console.log("User already exists. Updating password, role and status to active...");
    adminUser.password = hashedPassword;
    adminUser.role = "super_admin";
    adminUser.isActive = true;
    await adminUser.save();
    console.log("Super Admin updated successfully!");
  } else {
    console.log("Creating new Super Admin user...");
    adminUser = new User({
      name: "Super Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
      preferences: {
        theme: "dark",
        language: "en",
        timezone: "Asia/Kolkata",
        notifications: {
          lowStock: true,
          newPO: true,
          transfers: true,
        },
      },
    });
    await adminUser.save();
    console.log("Super Admin created successfully!");
  }

  // 2. Seed Organization Profile
  console.log("Checking organization settings...");
  let org = await Organization.findOne();
  if (!org) {
    console.log("Seeding default organization profile...");
    org = await Organization.create({
      name: "Industrial Solutions Inc.",
      logo: "",
      address: {
        line1: "100 Industrial Parkway",
        line2: "Sector 4",
        city: "Jamshedpur",
        state: "Jharkhand",
        country: "India",
        pincode: "831001",
      },
      gstin: "20AAAAA0000A1Z0",
      pan: "AAAAA0000A",
      phone: "+91-657-220011",
      email: "info@industrialsolutions.com",
      currency: "INR",
      fiscalYearStart: 4,
    });
    console.log("Organization profile seeded.");
  } else {
    console.log("Organization profile already exists.");
  }

  // 3. Seed Auto-Numbering Config
  console.log("Checking auto-numbering configurations...");
  let numberingSetting = await Setting.findOne({ key: "numbering" });
  const defaultNumbering = {
    items: { prefix: "ITM-", separator: "", digits: 5, includeYear: true },
    purchaseOrders: { prefix: "PO-", separator: "-", digits: 5, includeYear: true },
    grn: { prefix: "GRN-", separator: "-", digits: 5, includeYear: true },
    issueVouchers: { prefix: "IV-", separator: "-", digits: 5, includeYear: true },
    transfers: { prefix: "TRF-", separator: "-", digits: 5, includeYear: true },
    vendors: { prefix: "VND-", separator: "-", digits: 3, includeYear: false },
    warehouses: { prefix: "WH-", separator: "-", digits: 2, includeYear: false }
  };
  if (!numberingSetting) {
    console.log("Seeding default numbering layout...");
    await Setting.create({
      key: "numbering",
      value: defaultNumbering,
      group: "general",
      description: "Auto-number configurations",
    });
    console.log("Numbering layout seeded.");
  } else {
    console.log("Numbering layout configuration already exists.");
  }

  // 4. Seed Warehouse
  console.log("Checking warehouses...");
  let warehouse = await Warehouse.findOne({ code: "WH-01" });
  if (!warehouse) {
    console.log("Seeding default warehouse WH-01...");
    warehouse = await Warehouse.create({
      code: "WH-01",
      name: "Main Warehouse",
      type: "main",
      address: {
        line1: "Gate No. 1, Industrial Phase 1",
        city: "Jamshedpur",
        state: "Jharkhand",
        pincode: "831001",
      },
      manager: adminUser._id,
      isActive: true,
      zones: [
        { code: "Z1", name: "Receiving Zone", rows: 5, columns: 5 },
        { code: "Z2", name: "Storage Zone A", rows: 10, columns: 10 }
      ]
    });
    console.log("Warehouse WH-01 seeded successfully.");
  } else {
    console.log("Warehouse WH-01 already exists.");
  }

  // 5. Seed Units of Measurement (UoM)
  console.log("Seeding Units of Measurement...");
  const unitsToSeed = [
    { name: "Kilogram", symbol: "kg", type: "weight" },
    { name: "Gram", symbol: "g", type: "weight" },
    { name: "Pieces", symbol: "pcs", type: "count" },
    { name: "Meters", symbol: "m", type: "length" },
    { name: "Liters", symbol: "L", type: "volume" },
    { name: "Milliliters", symbol: "mL", type: "volume" },
    { name: "Set", symbol: "set", type: "count" },
    { name: "Box", symbol: "box", type: "count" },
    { name: "Roll", symbol: "roll", type: "count" }
  ];

  for (const u of unitsToSeed) {
    const exists = await Unit.findOne({ symbol: u.symbol });
    if (!exists) {
      await Unit.create(u);
      console.log(`Unit ${u.symbol} seeded.`);
    }
  }

  // Set up standard conversions (g to kg, mL to L)
  const kgUnit = await Unit.findOne({ symbol: "kg" });
  const gUnit = await Unit.findOne({ symbol: "g" });
  const lUnit = await Unit.findOne({ symbol: "L" });
  const mlUnit = await Unit.findOne({ symbol: "mL" });

  if (gUnit && kgUnit && gUnit.conversions.length === 0) {
    gUnit.conversions.push({ toUnit: kgUnit._id, factor: 0.001 });
    await gUnit.save();
    console.log("Seeded conversion: g -> kg");
  }
  if (mlUnit && lUnit && mlUnit.conversions.length === 0) {
    mlUnit.conversions.push({ toUnit: lUnit._id, factor: 0.001 });
    await mlUnit.save();
    console.log("Seeded conversion: mL -> L");
  }

  // 6. Seed Categories
  console.log("Seeding Categories...");
  const categoriesToSeed = [
    { name: "Raw Materials", slug: "raw-materials", parent: null, description: "Raw industrial materials" },
    { name: "Finished Goods", slug: "finished-goods", parent: null, description: "Finished products ready for dispatch" },
    { name: "Packing Material", slug: "packing-material", parent: null, description: "Boxes, tape, wraps" },
    { name: "Consumables", slug: "consumables", parent: null, description: "Oils, lubricants, gloves" },
    { name: "Spare Parts", slug: "spare-parts", parent: null, description: "Machine spare components" },
    { name: "Tools & Equipment", slug: "tools-equipment", parent: null, description: "Drills, cutters, testing tools" },
    { name: "Office Supplies", slug: "office-supplies", parent: null, description: "Paper, pens, files" }
  ];

  for (const c of categoriesToSeed) {
    const exists = await Category.findOne({ slug: c.slug });
    if (!exists) {
      await Category.create(c);
      console.log(`Root Category ${c.name} seeded.`);
    }
  }

  // Seed Subcategories under Raw Materials
  const rawMatCat = await Category.findOne({ slug: "raw-materials" });
  if (rawMatCat) {
    const subCats = [
      {
        name: "Metals",
        slug: "metals",
        parent: rawMatCat._id,
        description: "Steel, aluminum, copper sheets/rods",
        attributes: [
          { name: "Grade", type: "select", options: ["304", "316", "1018", "A36"], required: true },
          { name: "Thickness (mm)", type: "number", required: true },
          { name: "Finish", type: "text", required: false }
        ]
      },
      {
        name: "Polymers",
        slug: "polymers",
        parent: rawMatCat._id,
        description: "Resins, plastic raw items",
        attributes: []
      }
    ];

    for (const sub of subCats) {
      const exists = await Category.findOne({ slug: sub.slug });
      if (!exists) {
        await Category.create(sub);
        console.log(`Subcategory ${sub.name} seeded under Raw Materials.`);
      }
    }
  }

  // 7. Seed Departments
  console.log("Seeding Departments...");
  const departmentsToSeed = [
    { name: "Mechanical", code: "MECH", head: "Ramesh Sharma" },
    { name: "Electrical", code: "ELEC", head: "Sunil Verma" },
    { name: "Instrumentation", code: "INST", head: "Alok Gupta" },
    { name: "Civil", code: "CIVIL", head: "Sanjay Kumar" },
    { name: "Safety", code: "SAFE", head: "Vikas Singh" },
    { name: "Operations", code: "OPERS", head: "Rajesh Mishra" }
  ];

  for (const dept of departmentsToSeed) {
    const exists = await Department.findOne({ code: dept.code });
    if (!exists) {
      await Department.create(dept);
      console.log(`Department ${dept.name} (${dept.code}) seeded.`);
    }
  }

  console.log("\nSeeding Completed!");
  console.log("------------------");
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log("------------------");

  await mongoose.disconnect();
  console.log("Database disconnected.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
