import { z } from "zod";

export const CreateVendorSchema = z.object({
  name: z.string().min(2, "Vendor name must be at least 2 characters").max(200),
  type: z.enum(["manufacturer", "distributor", "trader", "service"] as const, {
    message: "Type must be manufacturer, distributor, trader, or service",
  }),
  contact: z
    .object({
      person: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email("Invalid email address").optional().or(z.literal("")),
      alternatePhone: z.string().optional(),
    })
    .optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format")
    .optional()
    .or(z.literal("")),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format")
    .optional()
    .or(z.literal("")),
  paymentTerms: z.string().optional(),
  creditDays: z.number().min(0).max(365).optional(),
  bankingDetails: z
    .object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      accountType: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;

export const UpdateVendorSchema = CreateVendorSchema.partial().extend({
  isActive: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
});

export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;
