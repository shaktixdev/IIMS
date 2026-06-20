import mongoose, { Schema, Document } from "mongoose";

export interface ISerialNumber extends Document {
  serialNumber: string;
  item: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  grn?: mongoose.Types.ObjectId;
  batch?: mongoose.Types.ObjectId;
  status: "AVAILABLE" | "ISSUED" | "IN_TRANSIT" | "RETURNED" | "DEFECTIVE";
  createdAt: Date;
  updatedAt: Date;
}

const SerialNumberSchema = new Schema<ISerialNumber>(
  {
    serialNumber: { type: String, required: true },
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    grn: { type: Schema.Types.ObjectId, ref: "GRN" },
    batch: { type: Schema.Types.ObjectId, ref: "Batch" },
    status: {
      type: String,
      enum: ["AVAILABLE", "ISSUED", "IN_TRANSIT", "RETURNED", "DEFECTIVE"],
      default: "AVAILABLE",
    },
  },
  { timestamps: true }
);

SerialNumberSchema.index({ serialNumber: 1, item: 1 }, { unique: true });
SerialNumberSchema.index({ item: 1, warehouse: 1, status: 1 });

export default mongoose.models.SerialNumber || mongoose.model<ISerialNumber>("SerialNumber", SerialNumberSchema);
