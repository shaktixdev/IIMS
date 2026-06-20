import { z } from "zod";

export const GRNLineItemSchema = z.object({
  item: z.string().min(1, "Item is required"),
  expectedQty: z.number().min(0, "Expected quantity must be non-negative"),
  receivedQty: z.number().min(0, "Received quantity must be non-negative"),
  acceptedQty: z.number().min(0, "Accepted quantity must be non-negative"),
  rejectedQty: z.number().min(0, "Rejected quantity must be non-negative"),
  rejectionReason: z.string().optional(),
  unitCost: z.number().optional(),
});

export type GRNLineItemInput = z.infer<typeof GRNLineItemSchema>;

export const CreateGRNSchema = z.object({
  po: z.string().min(1, "Purchase Order is required"),
  vendor: z.string().min(1, "Vendor is required"),
  warehouse: z.string().min(1, "Warehouse is required"),
  items: z.array(GRNLineItemSchema).min(1, "At least one line item is required"),
  referenceDocument: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateGRNInput = z.infer<typeof CreateGRNSchema>;
