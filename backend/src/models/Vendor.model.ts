import mongoose, { Schema, Document } from "mongoose";
import Counter from "./Counter.model.js";
import Setting from "./Setting.model.js";

export interface IVendor extends Document {
  code: string;
  name: string;
  type: "manufacturer" | "distributor" | "trader" | "service";
  contact: {
    person?: string;
    phone?: string;
    email?: string;
    alternatePhone?: string;
  };
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  gstin?: string;
  pan?: string;
  paymentTerms?: string;
  creditDays?: number;
  bankingDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountType?: string;
  };
  rating: number;
  notes?: string;
  preferredItems: mongoose.Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    code: { type: String, unique: true, sparse: true },
    name: { type: String, required: [true, "Vendor name is required"], trim: true },
    type: {
      type: String,
      enum: ["manufacturer", "distributor", "trader", "service"],
      required: [true, "Vendor type is required"],
    },
    contact: {
      person: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      alternatePhone: { type: String, default: "" },
    },
    address: {
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
      country: { type: String, default: "India" },
    },
    gstin: { type: String, default: "" },
    pan: { type: String, default: "" },
    paymentTerms: { type: String, default: "" },
    creditDays: { type: Number, default: 0 },
    bankingDetails: {
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      accountType: { type: String, default: "current" },
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    notes: { type: String, default: "" },
    preferredItems: [{ type: Schema.Types.ObjectId, ref: "Item" }],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Auto-generate Vendor Code on pre-validate
VendorSchema.pre("validate", async function (next) {
  if (this.code) return next();
  try {
    let numbering = await Setting.findOne({ key: "numbering" });
    const config = numbering?.value?.vendors || { prefix: "VND-", digits: 5, includeYear: true };

    const counter = await Counter.findByIdAndUpdate(
      "vendors",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqNum = String(counter.seq).padStart(config.digits, "0");
    const yearStr = config.includeYear ? String(new Date().getFullYear()) : "";
    this.code = `${config.prefix}${yearStr}${seqNum}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

// Indexes
VendorSchema.index({ name: "text" });
VendorSchema.index({ gstin: 1 });
VendorSchema.index({ isActive: 1, isDeleted: 1 });

export default mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", VendorSchema);
