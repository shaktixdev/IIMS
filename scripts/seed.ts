import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Manually load environment variables if not already loaded
if (!process.env.MONGODB_URI) {
  try {
    let envPath = path.resolve(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) {
      envPath = path.resolve(process.cwd(), ".env");
    }
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      envContent.split("\n").forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
          const firstEqual = trimmedLine.indexOf("=");
          if (firstEqual !== -1) {
            const key = trimmedLine.substring(0, firstEqual).trim();
            let val = trimmedLine.substring(firstEqual + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1);
            } else if (val.startsWith("'") && val.endsWith("'")) {
              val = val.substring(1, val.length - 1);
            }
            process.env[key] = val;
          }
        }
      });
      console.log(`Loaded environment variables from ${path.basename(envPath)}`);
    }
  } catch (err) {
    console.error("Could not load environment file:", err);
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not defined!");
  process.exit(1);
}

// Inline Schema & Model definitions to avoid TS/Next config alias import resolution issues in raw TS execution
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

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    head: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Department = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to database.");

  console.log("Seeding default departments...");
  const departmentsToSeed = [
    { name: "Electrical", code: "ELEC" },
    { name: "Mechanical", code: "MECH" },
    { name: "Civil", code: "CIVIL" },
    { name: "Production", code: "PROD" },
    { name: "Maintenance", code: "MAINT" },
    { name: "Safety", code: "SAFE" },
    { name: "Instrumentation", code: "INST" },
    { name: "IT", code: "IT" },
    { name: "Admin", code: "ADMIN" },
    { name: "Other", code: "OTHER" },
  ];

  for (const dept of departmentsToSeed) {
    const existing = await Department.findOne({ code: dept.code });
    if (!existing) {
      await Department.create(dept);
      console.log(`Created department: ${dept.name}`);
    }
  }


  const adminEmail = "admin@company.com";
  const adminPassword = "admin123";

  console.log(`Checking if super_admin with email ${adminEmail} exists...`);
  const existingUser = await User.findOne({ email: adminEmail });

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  if (existingUser) {
    console.log("User already exists. Updating password, role and status to active...");
    existingUser.password = hashedPassword;
    existingUser.role = "super_admin";
    existingUser.isActive = true;
    await existingUser.save();
    console.log("Super Admin updated successfully!");
  } else {
    console.log("Creating new Super Admin user...");
    const superAdmin = new User({
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
    await superAdmin.save();
    console.log("Super Admin created successfully!");
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
