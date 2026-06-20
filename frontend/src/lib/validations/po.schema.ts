import { z } from "zod";

export const POLineItemSchema = z.object({
  item: z.string().min(1, "Item is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unitCost: z.number().min(0, "Unit cost cannot be negative"),
  gstRate: z.number().min(0).max(100).default(18),
  discountPct: z.number().min(0).max(100).default(0),
});

export type POLineItemInput = z.infer<typeof POLineItemSchema>;

export const CreatePOSchema = z.object({
  vendor: z.string().min(1, "Vendor is required"),
  warehouse: z.string().min(1, "Receiving warehouse is required"),
  deliveryDate: z.coerce.date().optional(),
  referenceNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
  shippingAddress: z
    .object({
      line1: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
    })
    .optional(),
  items: z.array(POLineItemSchema).min(1, "At least one line item is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  internalNotes: z.string().optional(),
});

export type CreatePOInput = z.infer<typeof CreatePOSchema>;
