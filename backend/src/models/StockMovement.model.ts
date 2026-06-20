import mongoose, { Schema, Document } from "mongoose";

export interface IStockMovement extends Document {
  item: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
  quantity: number; // Positive or negative based on IN/OUT
  referenceType: "GRN" | "ISSUE" | "TRANSFER" | "ADJUSTMENT" | "INITIAL" | "RETURN";
  referenceId?: mongoose.Types.ObjectId;
  batch?: mongoose.Types.ObjectId;
  serialNumber?: mongoose.Types.ObjectId;
  date: Date;
  performedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    type: { type: String, enum: ["IN", "OUT", "ADJUSTMENT", "TRANSFER"], required: true },
    quantity: { type: Number, required: true },
    referenceType: { 
      type: String, 
      enum: ["GRN", "ISSUE", "TRANSFER", "ADJUSTMENT", "INITIAL", "RETURN"], 
      required: true 
    },
    referenceId: { type: Schema.Types.ObjectId },
    batch: { type: Schema.Types.ObjectId, ref: "Batch" },
    serialNumber: { type: Schema.Types.ObjectId, ref: "SerialNumber" },
    date: { type: Date, default: Date.now, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // Immutable effectively
);

StockMovementSchema.index({ item: 1, warehouse: 1, date: -1 });
StockMovementSchema.index({ referenceType: 1, referenceId: 1 });

export default mongoose.models.StockMovement || mongoose.model<IStockMovement>("StockMovement", StockMovementSchema);
