import mongoose, { Schema, Document } from "mongoose";

export interface IZone {
  code: string;
  name: string;
  rows?: number;
  columns?: number;
}

export interface IWarehouse extends Document {
  code: string;
  name: string;
  type: "main" | "sub" | "transit" | "production" | "dispatch";
  address: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  manager?: mongoose.Types.ObjectId;
  isActive: boolean;
  zones: IZone[];
  createdAt: Date;
  updatedAt: Date;
}

const ZoneSchema = new Schema<IZone>({
  code: { type: String, required: true },
  name: { type: String, required: true },
  rows: { type: Number, default: 0 },
  columns: { type: Number, default: 0 },
});

const WarehouseSchema = new Schema<IWarehouse>(
  {
    code: {
      type: String,
      required: [true, "Warehouse code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Warehouse name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["main", "sub", "transit", "production", "dispatch"],
      default: "main",
      required: true,
    },
    address: {
      line1: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    zones: [ZoneSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IWarehouse>("Warehouse", WarehouseSchema);
