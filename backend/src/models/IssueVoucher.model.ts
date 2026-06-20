import mongoose, { Schema, Document } from "mongoose";
import Counter from "./Counter.model.js";
import Setting from "./Setting.model.js";

export interface IIssueLineItem {
  _id?: mongoose.Types.ObjectId;
  item: mongoose.Types.ObjectId;
  requestedQty: number;
  issuedQty: number;
  returnedQty: number;
  batches?: {
    batchId: mongoose.Types.ObjectId;
    quantity: number;
  }[];
  serialNumbers?: mongoose.Types.ObjectId[];
}

export interface IIssueVoucher extends Document {
  ivNumber: string;
  warehouse: mongoose.Types.ObjectId;
  requester: {
    name: string;
    employeeId?: string;
    department: mongoose.Types.ObjectId; // References Department model
    departmentOther?: string;
    departmentName?: string; // Cache resolved department name
  };
  approver: {
    name: string;
    designation: string;
    slipReference?: string;
  };
  status: "issued" | "partial_return" | "fully_returned" | "draft" | "cancelled";
  issueDate?: Date;
  items: IIssueLineItem[];
  notes?: string;
  createdBy?: mongoose.Types.ObjectId; // Storekeeper user
  approvedBy?: mongoose.Types.ObjectId; // Optional or mapped from backend user
  isDeleted: boolean;
  returns: mongoose.Types.ObjectId[]; // References ItemReturn docs
  createdAt: Date;
  updatedAt: Date;
}

const IssueLineItemSchema = new Schema<IIssueLineItem>(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    requestedQty: { type: Number, required: true, min: 0.001 },
    issuedQty: { type: Number, default: 0, min: 0 },
    returnedQty: { type: Number, default: 0, min: 0 },
    batches: [
      {
        batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
        quantity: { type: Number, min: 0 },
      },
    ],
    serialNumbers: [{ type: Schema.Types.ObjectId, ref: "SerialNumber" }],
  },
  { _id: true } // Enable _id to reference lines uniquely
);

const IssueVoucherSchema = new Schema<IIssueVoucher>(
  {
    ivNumber: { type: String, unique: true, sparse: true },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    requester: {
      name: { type: String, required: true, trim: true },
      employeeId: { type: String, default: "" },
      department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
      departmentOther: { type: String, default: "" },
      departmentName: { type: String, default: "" },
    },
    approver: {
      name: { type: String, required: true, trim: true },
      designation: { type: String, required: true, trim: true },
      slipReference: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["draft", "issued", "partial_return", "fully_returned", "cancelled"],
      default: "issued",
    },
    issueDate: { type: Date, default: Date.now },
    items: [IssueLineItemSchema],
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    returns: [{ type: Schema.Types.ObjectId, ref: "ItemReturn" }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

IssueVoucherSchema.pre("validate", async function (next) {
  if (this.ivNumber) return next();
  try {
    let numbering = await Setting.findOne({ key: "numbering" });
    const config = numbering?.value?.issueVouchers || { prefix: "IV-", digits: 5, includeYear: true };

    const counter = await Counter.findByIdAndUpdate(
      "issueVoucher",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqNum = String(counter.seq).padStart(config.digits, "0");
    const yearStr = config.includeYear ? String(new Date().getFullYear()) : "";
    this.ivNumber = `${config.prefix}${yearStr}${seqNum}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

export default mongoose.models.IssueVoucher || mongoose.model<IIssueVoucher>("IssueVoucher", IssueVoucherSchema);
