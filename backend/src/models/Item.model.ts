import mongoose, { Schema, Document } from "mongoose";
import Counter from "./Counter.model.js";
import Setting from "./Setting.model.js";

export interface IItem extends Omit<Document, "model"> {
  sku: string;
  name: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  unit: mongoose.Types.ObjectId;
  purchaseUnit?: mongoose.Types.ObjectId;
  conversionFactor: number;
  
  // Pricing
  costPrice: number;
  lastPurchasePrice?: number;
  valuationMethod: "FIFO" | "FEFO" | "LIFO" | "AVERAGE";
  
  // Stock Settings
  minStockLevel: number;
  maxStockLevel?: number;
  reorderQty?: number;
  leadTimeDays?: number;
  
  // Physical
  weight?: number;
  weightUnit?: mongoose.Types.ObjectId;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  
  // Identification
  barcode?: string;
  hsnCode?: string;
  partNumber?: string;
  brand?: string;
  model?: string;
  
  // Tracking
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  hasExpiry: boolean;
  expiryAlertDays: number;
  
  // Media
  images: string[];
  documents: Array<{ name: string; url: string; type: string }>;
  
  // Dynamic attributes
  attributes: Map<string, any>;
  
  // Preferred vendors
  preferredVendors: mongoose.Types.ObjectId[];
  
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    sku: { type: String, unique: true },
    name: { type: String, required: [true, "Item name is required"], trim: true },
    description: { type: String, default: "" },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: [true, "Category is required"] },
    subcategory: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    unit: { type: Schema.Types.ObjectId, ref: "Unit", required: [true, "Unit of measure is required"] },
    purchaseUnit: { type: Schema.Types.ObjectId, ref: "Unit", default: null },
    conversionFactor: { type: Number, default: 1 },
    
    costPrice: { type: Number, default: 0 },
    lastPurchasePrice: { type: Number, default: 0 },
    valuationMethod: {
      type: String,
      enum: ["FIFO", "FEFO", "LIFO", "AVERAGE"],
      default: "AVERAGE",
    },
    
    minStockLevel: { type: Number, default: 0 },
    maxStockLevel: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    leadTimeDays: { type: Number, default: 0 },
    
    weight: { type: Number, default: 0 },
    weightUnit: { type: Schema.Types.ObjectId, ref: "Unit", default: null },
    dimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      unit: { type: String, default: "cm" },
    },
    
    barcode: { type: String, default: "" },
    hsnCode: { type: String, default: "" },
    partNumber: { type: String, default: "" },
    brand: { type: String, default: "" },
    model: { type: String, default: "" },
    
    isBatchTracked: { type: Boolean, default: false },
    isSerialTracked: { type: Boolean, default: false },
    hasExpiry: { type: Boolean, default: false },
    expiryAlertDays: { type: Number, default: 30 },
    
    images: [{ type: String }],
    documents: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
      },
    ],
    
    attributes: { type: Map, of: Schema.Types.Mixed, default: {} },
    preferredVendors: [{ type: Schema.Types.ObjectId, ref: "Vendor" }],
    
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// SKU generation pre-validate hook
ItemSchema.pre("validate", async function (next) {
  if (this.sku) return next();
  try {
    let numbering = await Setting.findOne({ key: "numbering" });
    const config = numbering?.value?.items || { prefix: "ITM-", separator: "", digits: 5, includeYear: true };
    
    const counter = await Counter.findByIdAndUpdate(
      "items",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    
    const seqNum = String(counter.seq).padStart(config.digits, "0");
    const yearStr = config.includeYear ? String(new Date().getFullYear()) : "";
    
    this.sku = `${config.prefix}${yearStr}${config.separator}${seqNum}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

// Pre-save hook to capture isNew status
ItemSchema.pre("save", function (next) {
  (this as any).wasNew = this.isNew;
  next();
});

// Post-save hook to automatically seed Stock records for active warehouses on item creation
ItemSchema.post("save", async function (doc: any) {
  if (doc.wasNew) {
    try {
      const activeWarehouses = await mongoose.model("Warehouse").find({ isActive: true });
      if (activeWarehouses.length > 0) {
        const stockDocs = activeWarehouses.map((wh: any) => ({
          item: doc._id,
          warehouse: wh._id,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityOnOrder: 0,
          quantityInTransit: 0,
          averageCost: doc.costPrice || 0,
          totalValue: 0
        }));
        await mongoose.model("Stock").insertMany(stockDocs);
      }
    } catch (error) {
      console.error("Error initializing stock in Item post-save hook:", error);
    }
  }
});

// Indexes
ItemSchema.index({ barcode: 1 });
ItemSchema.index({ name: "text", description: "text" });
ItemSchema.index({ category: 1, isActive: 1 });

export default mongoose.models.Item || mongoose.model<IItem>("Item", ItemSchema);
