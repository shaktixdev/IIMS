import mongoose, { Schema, Document } from "mongoose";
import Counter from "./Counter.model.js";
import Setting from "./Setting.model.js";

export interface ITransferLineItem {
  _id?: mongoose.Types.ObjectId;
  item: mongoose.Types.ObjectId;
  requestedQty: number;
  dispatchedQty: number;
  receivedQty: number;
  unit: mongoose.Types.ObjectId;
  batch?: mongoose.Types.ObjectId;
  serialNumbers?: mongoose.Types.ObjectId[];
  fromZone?: string;
  fromBin?: string;
  toZone?: string;
  toBin?: string;
  notes?: string;
}

export interface ITransfer extends Document {
  transferNumber: string;
  status: "draft" | "in_transit" | "received" | "cancelled" | "partial";
  fromWarehouse: mongoose.Types.ObjectId;
  toWarehouse: mongoose.Types.ObjectId;
  expectedDate?: Date;
  dispatchDate?: Date;
  receivedDate?: Date;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  items: ITransferLineItem[];
  notes?: string;
  attachments?: Array<{ name: string; url: string }>;
  createdBy?: mongoose.Types.ObjectId;
  dispatchedBy?: mongoose.Types.ObjectId;
  receivedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TransferLineItemSchema = new Schema<ITransferLineItem>(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    requestedQty: { type: Number, required: true, min: 0.001 },
    dispatchedQty: { type: Number, default: 0, min: 0 },
    receivedQty: { type: Number, default: 0, min: 0 },
    unit: { type: Schema.Types.ObjectId, ref: "Unit", required: true },
    batch: { type: Schema.Types.ObjectId, ref: "Batch" },
    serialNumbers: [{ type: Schema.Types.ObjectId, ref: "SerialNumber" }],
    fromZone: { type: String, default: "" },
    fromBin: { type: String, default: "" },
    toZone: { type: String, default: "" },
    toBin: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: true }
);

const TransferSchema = new Schema<ITransfer>(
  {
    transferNumber: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["draft", "in_transit", "received", "cancelled", "partial"],
      default: "draft",
      required: true,
    },
    fromWarehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    toWarehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    expectedDate: { type: Date },
    dispatchDate: { type: Date },
    receivedDate: { type: Date },
    vehicleNumber: { type: String, default: "" },
    driverName: { type: String, default: "" },
    driverPhone: { type: String, default: "" },
    items: [TransferLineItemSchema],
    notes: { type: String, default: "" },
    attachments: [
      {
        name: { type: String },
        url: { type: String },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    dispatchedBy: { type: Schema.Types.ObjectId, ref: "User" },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TransferSchema.pre("validate", async function (next) {
  if (this.transferNumber) return next();
  try {
    let numbering = await Setting.findOne({ key: "numbering" });
    const config = numbering?.value?.transfers || { prefix: "TRF-", separator: "-", digits: 5, includeYear: true };

    const counter = await Counter.findByIdAndUpdate(
      "transfers",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqNum = String(counter.seq).padStart(config.digits, "0");
    const yearStr = config.includeYear ? String(new Date().getFullYear()) : "";
    const sep = config.separator !== undefined ? config.separator : "-";
    this.transferNumber = `${config.prefix}${yearStr}${sep}${seqNum}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

export default mongoose.models.Transfer || mongoose.model<ITransfer>("Transfer", TransferSchema);
