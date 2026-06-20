import mongoose, { Schema, Document } from "mongoose";
import Counter from "./Counter.model.js";
import Setting from "./Setting.model.js";

export interface IStockCountItem {
  _id?: mongoose.Types.ObjectId;
  item: mongoose.Types.ObjectId;
  systemQty: number;
  countedQty: number;
  variance: number;
  notes?: string;
}

export interface IStockCount extends Document {
  stockCountNumber: string;
  warehouse: mongoose.Types.ObjectId;
  zone?: string;
  status: "draft" | "in_progress" | "completed" | "approved";
  items: IStockCountItem[];
  notes?: string;
  startedAt: Date;
  completedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StockCountItemSchema = new Schema<IStockCountItem>(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    systemQty: { type: Number, required: true, default: 0 },
    countedQty: { type: Number, required: true, default: 0 },
    variance: { type: Number, required: true, default: 0 },
    notes: { type: String, default: "" },
  },
  { _id: true }
);

const StockCountSchema = new Schema<IStockCount>(
  {
    stockCountNumber: { type: String, unique: true, sparse: true },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    zone: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "in_progress", "completed", "approved"],
      default: "draft",
      required: true,
    },
    items: [StockCountItemSchema],
    notes: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

StockCountSchema.pre("validate", async function (next) {
  if (this.stockCountNumber) return next();
  try {
    let numbering = await Setting.findOne({ key: "numbering" });
    const config = numbering?.value?.stockCounts || { prefix: "STC-", separator: "-", digits: 5, includeYear: true };

    const counter = await Counter.findByIdAndUpdate(
      "stockCounts",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqNum = String(counter.seq).padStart(config.digits, "0");
    const yearStr = config.includeYear ? String(new Date().getFullYear()) : "";
    const sep = config.separator !== undefined ? config.separator : "-";
    this.stockCountNumber = `${config.prefix}${yearStr}${sep}${seqNum}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

export default mongoose.models.StockCount || mongoose.model<IStockCount>("StockCount", StockCountSchema);
