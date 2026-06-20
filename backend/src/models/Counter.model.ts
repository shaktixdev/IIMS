import mongoose, { Schema, Document } from "mongoose";

export interface ICounter extends Omit<Document, "_id"> {
  _id: string; // Name of the sequence, e.g., 'items', 'purchaseOrders', etc.
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
    _id: false, // Tell Mongoose we are defining _id manually as String
  }
);

export default mongoose.model<ICounter>("Counter", CounterSchema);
