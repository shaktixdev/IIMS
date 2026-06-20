import mongoose, { Schema, Document } from "mongoose";
import Counter from "./Counter.model.js";
import Setting from "./Setting.model.js";

export interface IPOLineItem {
  item: mongoose.Types.ObjectId;
  itemName?: string;
  itemSku?: string;
  quantity: number;
  receivedQty: number;
  unit?: mongoose.Types.ObjectId;
  unitCost: number;
  gstRate: number;
  discountPct: number;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  netAmount: number;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  vendor: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  status: "draft" | "sent" | "partial" | "received" | "cancelled" | "closed";
  deliveryDate?: Date;
  referenceNumber?: string;
  paymentTerms?: string;
  shippingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  items: IPOLineItem[];
  subTotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  internalNotes?: string;
  sentAt?: Date;
  receivedAt?: Date;
  cancelledAt?: Date;
  closedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const POLineItemSchema = new Schema<IPOLineItem>(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    itemName: { type: String, default: "" },
    itemSku: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0.001 },
    receivedQty: { type: Number, default: 0 },
    unit: { type: Schema.Types.ObjectId, ref: "Unit" },
    unitCost: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, default: 18, min: 0, max: 100 },
    discountPct: { type: Number, default: 0, min: 0, max: 100 },
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, unique: true, sparse: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: [true, "Vendor is required"] },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: [true, "Warehouse is required"] },
    status: {
      type: String,
      enum: ["draft", "sent", "partial", "received", "cancelled", "closed"],
      default: "draft",
    },
    deliveryDate: { type: Date },
    referenceNumber: { type: String, default: "" },
    paymentTerms: { type: String, default: "" },
    shippingAddress: {
      line1: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },
    items: [POLineItemSchema],
    subTotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalGst: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    terms: { type: String, default: "" },
    internalNotes: { type: String, default: "" },
    sentAt: { type: Date },
    receivedAt: { type: Date },
    cancelledAt: { type: Date },
    closedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate PO Number on pre-validate
PurchaseOrderSchema.pre("validate", async function (next) {
  if (this.poNumber) return next();
  try {
    let numbering = await Setting.findOne({ key: "numbering" });
    const config = numbering?.value?.purchaseOrders || { prefix: "PO-", digits: 5, includeYear: true };

    const counter = await Counter.findByIdAndUpdate(
      "purchaseOrders",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqNum = String(counter.seq).padStart(config.digits, "0");
    const yearStr = config.includeYear ? String(new Date().getFullYear()) : "";
    this.poNumber = `${config.prefix}${yearStr}${seqNum}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

// Helper: compute line item totals
export function computeLineItem(
  quantity: number,
  unitCost: number,
  gstRate: number,
  discountPct: number
) {
  const subtotal = quantity * unitCost;
  const discountAmount = parseFloat(((subtotal * discountPct) / 100).toFixed(2));
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = parseFloat(((afterDiscount * gstRate) / 100).toFixed(2));
  const netAmount = parseFloat((afterDiscount + gstAmount).toFixed(2));
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountAmount,
    gstAmount,
    netAmount,
  };
}

// Helper: recompute PO totals from line items
export function computePOTotals(items: IPOLineItem[]) {
  const subTotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discountAmount, 0);
  const totalGst = items.reduce((s, i) => s + i.gstAmount, 0);
  const grandTotal = items.reduce((s, i) => s + i.netAmount, 0);
  return {
    subTotal: parseFloat(subTotal.toFixed(2)),
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    totalGst: parseFloat(totalGst.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
  };
}

// Indexes
PurchaseOrderSchema.index({ vendor: 1, status: 1 });
PurchaseOrderSchema.index({ warehouse: 1, status: 1 });
PurchaseOrderSchema.index({ createdAt: -1 });
PurchaseOrderSchema.index({ deliveryDate: 1, status: 1 });

export default mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
