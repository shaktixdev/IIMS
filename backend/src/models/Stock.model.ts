import mongoose, { Schema, Document } from "mongoose";

export interface IStock extends Document {
  item: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  zone?: string;
  bin?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityOnOrder: number;
  quantityInTransit: number;
  quantityAvailable: number; // Virtual field or custom logic
  totalValue: number;
  averageCost: number;
  lastMovement?: Date;
  lastCountDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockSchema = new Schema<IStock>(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    zone: { type: String, default: "" },
    bin: { type: String, default: "" },
    quantityOnHand: { type: Number, default: 0 },
    quantityReserved: { type: Number, default: 0 },
    quantityOnOrder: { type: Number, default: 0 },
    quantityInTransit: { type: Number, default: 0 },
    averageCost: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    lastMovement: { type: Date },
    lastCountDate: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Compound Index unique
StockSchema.index({ item: 1, warehouse: 1 }, { unique: true });

// Virtual for quantityAvailable
StockSchema.virtual("quantityAvailable").get(function () {
  return this.quantityOnHand - this.quantityReserved;
});

// pre-save hook to calculate totalValue = quantityOnHand * averageCost
StockSchema.pre("save", function (next) {
  this.totalValue = this.quantityOnHand * this.averageCost;
  next();
});

export default mongoose.models.Stock || mongoose.model<IStock>("Stock", StockSchema);
