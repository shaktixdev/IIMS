import mongoose, { Schema, Document } from "mongoose";

export interface IUnitConversion {
  toUnit: mongoose.Types.ObjectId;
  factor: number;
}

export interface IUnit extends Document {
  name: string;
  symbol: string;
  type: "weight" | "length" | "volume" | "area" | "count" | "time" | "other";
  conversions: IUnitConversion[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UnitConversionSchema = new Schema<IUnitConversion>({
  toUnit: {
    type: Schema.Types.ObjectId,
    ref: "Unit",
    required: true,
  },
  factor: {
    type: Number,
    required: true,
  },
});

const UnitSchema = new Schema<IUnit>(
  {
    name: {
      type: String,
      required: [true, "Unit name is required"],
      trim: true,
    },
    symbol: {
      type: String,
      required: [true, "Unit symbol is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["weight", "length", "volume", "area", "count", "time", "other"],
      default: "count",
      required: true,
    },
    conversions: [UnitConversionSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUnit>("Unit", UnitSchema);
