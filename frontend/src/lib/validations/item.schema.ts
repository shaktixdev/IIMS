import { z } from "zod";

export const CreateItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  description: z.string().optional().default(""),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional().nullable(),
  unit: z.string().min(1, "Unit of measure is required"),
  purchaseUnit: z.string().optional().nullable(),
  conversionFactor: z.coerce.number().min(1).default(1),
  costPrice: z.coerce.number().min(0).default(0),
  minStockLevel: z.coerce.number().min(0).default(0),
  maxStockLevel: z.coerce.number().min(0).optional().default(0),
  reorderQty: z.coerce.number().min(0).optional().default(0),
  leadTimeDays: z.coerce.number().min(0).optional().default(0),
  weight: z.coerce.number().min(0).optional().default(0),
  weightUnit: z.string().optional().nullable(),
  dimensions: z.object({
    length: z.coerce.number().min(0).optional().default(0),
    width: z.coerce.number().min(0).optional().default(0),
    height: z.coerce.number().min(0).optional().default(0),
    unit: z.string().default("cm"),
  }).optional(),
  barcode: z.string().optional().default(""),
  hsnCode: z.string().optional().default(""),
  partNumber: z.string().optional().default(""),
  brand: z.string().optional().default(""),
  model: z.string().optional().default(""),
  isBatchTracked: z.boolean().default(false),
  isSerialTracked: z.boolean().default(false),
  hasExpiry: z.boolean().default(false),
  expiryAlertDays: z.coerce.number().min(0).default(30),
  attributes: z.record(z.string(), z.any()).default({}),
  preferredVendors: z.array(z.string()).default([]),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;
