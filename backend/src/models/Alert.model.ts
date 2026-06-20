import mongoose, { Schema, Document } from "mongoose";

export interface IAlert extends Document {
  type: "low_stock" | "expiry_warning" | "po_overdue" | "delayed_delivery" | "info";
  title: string;
  message: string;
  item?: mongoose.Types.ObjectId;
  warehouse?: mongoose.Types.ObjectId;
  referenceId?: mongoose.Types.ObjectId;
  referenceType?: string;
  status: "unread" | "read";
  severity: "info" | "warning" | "critical";
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    type: {
      type: String,
      enum: ["low_stock", "expiry_warning", "po_overdue", "delayed_delivery", "info"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    item: { type: Schema.Types.ObjectId, ref: "Item", default: null },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", default: null },
    referenceId: { type: Schema.Types.ObjectId, default: null },
    referenceType: { type: String, default: null },
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
  },
  { timestamps: true }
);

// Indexes for fast querying
AlertSchema.index({ status: 1, createdAt: -1 });
AlertSchema.index({ type: 1, status: 1 });
AlertSchema.index({ referenceId: 1, referenceType: 1 });

export default mongoose.models.Alert || mongoose.model<IAlert>("Alert", AlertSchema);
