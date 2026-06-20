import mongoose, { Schema, Document } from "mongoose";
import Counter from "./Counter.model.js";
import Setting from "./Setting.model.js";

export interface IGRNLineItem {
  item: mongoose.Types.ObjectId;
  expectedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
  unitCost?: number; // Usually copied from PO
  batchNumber?: string;
  expiryDate?: Date;
  serialNumbers?: string[];
  zone?: string;
  bin?: string;
}

export interface IGRN extends Document {
  grnNumber: string;
  po: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  status: "draft" | "completed" | "cancelled";
  receivedDate?: Date;
  referenceDocument?: string;
  items: IGRNLineItem[];
  notes?: string;
  receivedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GRNLineItemSchema = new Schema<IGRNLineItem>(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    expectedQty: { type: Number, required: true, min: 0 },
    receivedQty: { type: Number, required: true, min: 0 },
    acceptedQty: { type: Number, required: true, min: 0 },
    rejectedQty: { type: Number, default: 0, min: 0 },
    rejectionReason: { type: String, default: "" },
    unitCost: { type: Number, default: 0 },
    batchNumber: { type: String, default: "" },
    expiryDate: { type: Date },
    serialNumbers: [{ type: String }],
    zone: { type: String, default: "" },
    bin: { type: String, default: "" },
  },
  { _id: false }
);

const GRNSchema = new Schema<IGRN>(
  {
    grnNumber: { type: String, unique: true, sparse: true },
    po: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    status: {
      type: String,
      enum: ["draft", "completed", "cancelled"],
      default: "draft",
    },
    receivedDate: { type: Date, default: Date.now },
    referenceDocument: { type: String, default: "" },
    items: [GRNLineItemSchema],
    notes: { type: String, default: "" },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate GRN Number on pre-validate
GRNSchema.pre("validate", async function (next) {
  if (this.grnNumber) return next();
  try {
    let numbering = await Setting.findOne({ key: "numbering" });
    const config = numbering?.value?.grn || { prefix: "GRN-", digits: 5, includeYear: true };

    const counter = await Counter.findByIdAndUpdate(
      "grn",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqNum = String(counter.seq).padStart(config.digits, "0");
    const yearStr = config.includeYear ? String(new Date().getFullYear()) : "";
    this.grnNumber = `${config.prefix}${yearStr}${seqNum}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

export default mongoose.models.GRN || mongoose.model<IGRN>("GRN", GRNSchema);
