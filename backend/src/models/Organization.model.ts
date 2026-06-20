import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  logo?: string;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  currency: string;
  fiscalYearStart: number; // 1-12
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    logo: {
      type: String,
      default: "",
    },
    address: {
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },
    gstin: {
      type: String,
      trim: true,
      default: "",
    },
    pan: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    currency: {
      type: String,
      default: "INR",
    },
    fiscalYearStart: {
      type: Number,
      default: 4, // April
      min: 1,
      max: 12,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrganization>("Organization", OrganizationSchema);
