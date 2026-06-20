import mongoose, { Schema, Document } from "mongoose";
import Counter from "./Counter.model.js";
import Setting from "./Setting.model.js";

export interface IItemReturnLineItem {
  issueLineId: mongoose.Types.ObjectId; // References the line _id in original IssueVoucher items array
  item: mongoose.Types.ObjectId;
  returnedQty: number;
  condition: "good" | "damaged" | "partial_damage";
  notes?: string;
  serialNumbers?: mongoose.Types.ObjectId[];
}

export interface IItemReturn extends Document {
  returnNumber: string;
  issueVoucher: mongoose.Types.ObjectId; // References original IssueVoucher
  returnedAt: Date;
  receivedBy: mongoose.Types.ObjectId; // Storekeeper who received
  items: IItemReturnLineItem[];
  remarks?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ItemReturnLineItemSchema = new Schema<IItemReturnLineItem>(
  {
    issueLineId: { type: Schema.Types.ObjectId, required: true },
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    returnedQty: { type: Number, required: true, min: 0.001 },
    condition: {
      type: String,
      enum: ["good", "damaged", "partial_damage"],
      default: "good",
      required: true,
    },
    notes: { type: String, default: "" },
    serialNumbers: [{ type: Schema.Types.ObjectId, ref: "SerialNumber" }],
  },
  { _id: false }
);

const ItemReturnSchema = new Schema<IItemReturn>(
  {
    returnNumber: { type: String, unique: true, sparse: true },
    issueVoucher: { type: Schema.Types.ObjectId, ref: "IssueVoucher", required: true },
    returnedAt: { type: Date, default: Date.now },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [ItemReturnLineItemSchema],
    remarks: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate Return Number on pre-validate
ItemReturnSchema.pre("validate", async function (next) {
  if (this.returnNumber) return next();
  try {
    let numbering = await Setting.findOne({ key: "numbering" });
    const config = numbering?.value?.returns || { prefix: "RTN-", digits: 5, includeYear: true };

    const counter = await Counter.findByIdAndUpdate(
      "return",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqNum = String(counter.seq).padStart(config.digits, "0");
    const yearStr = config.includeYear ? String(new Date().getFullYear()) : "";
    this.returnNumber = `${config.prefix}${yearStr}${seqNum}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

export default mongoose.models.ItemReturn || mongoose.model<IItemReturn>("ItemReturn", ItemReturnSchema);
