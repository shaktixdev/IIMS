import mongoose, { Schema, Document } from "mongoose";

export interface IBatch extends Document {
  batchNumber: string;
  item: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  grn?: mongoose.Types.ObjectId;
  manufactureDate?: Date;
  expiryDate?: Date;
  initialQuantity: number;
  currentQuantity: number;
  status: "ACTIVE" | "EXPIRED" | "DEPLETED";
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    batchNumber: { type: String, required: true },
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    grn: { type: Schema.Types.ObjectId, ref: "GRN" },
    manufactureDate: { type: Date },
    expiryDate: { type: Date },
    initialQuantity: { type: Number, required: true, min: 0 },
    currentQuantity: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "DEPLETED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

BatchSchema.index({ batchNumber: 1, item: 1 }, { unique: true });
BatchSchema.index({ item: 1, warehouse: 1, expiryDate: 1 });

// Helper to auto-update status
BatchSchema.pre("save", function (next) {
  if (this.currentQuantity <= 0) {
    this.status = "DEPLETED";
  } else if (this.expiryDate && new Date() > this.expiryDate) {
    this.status = "EXPIRED";
  } else {
    this.status = "ACTIVE";
  }
  next();
});

export default mongoose.models.Batch || mongoose.model<IBatch>("Batch", BatchSchema);
