import { z } from "zod";

export const IssueLineItemSchema = z.object({
  item: z.string().min(1, "Item is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit of measure is required"),
  batch: z.string().optional(),
  remarks: z.string().optional(),
});

export type IssueLineItemInput = z.infer<typeof IssueLineItemSchema>;

export const CreateIssueSchema = z.object({
  warehouse: z.string().min(1, "Warehouse is required"),
  requester: z
    .object({
      name: z.string().min(2, "Helper/Worker name is required"),
      employeeId: z.string().optional(),
      department: z.string().optional(), // ObjectId (nullable/empty if 'Other')
      departmentOther: z.string().optional(),
    })
    .refine((r) => r.department || r.departmentOther, {
      message: "Department is required",
      path: ["department"],
    }),
  approver: z.object({
    name: z.string().min(2, "Approver name is required"),
    designation: z.string().min(2, "Designation is required"),
    slipReference: z.string().optional(),
  }),
  items: z.array(IssueLineItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
});

export type CreateIssueInput = z.infer<typeof CreateIssueSchema>;

// Returns Schema
export const ReturnLineItemSchema = z.object({
  issueLineId: z.string().min(1, "Line ID is required"),
  item: z.string().min(1, "Item is required"),
  returnedQty: z.number().positive("Return quantity must be greater than 0"),
  condition: z.enum(["good", "damaged", "partial_damage"]),
  notes: z.string().optional(),
});

export type ReturnLineItemInput = z.infer<typeof ReturnLineItemSchema>;

export const CreateReturnSchema = z.object({
  issueVoucherId: z.string().min(1, "Original issue voucher ID is required"),
  items: z.array(ReturnLineItemSchema).min(1, "At least one return item is required"),
  remarks: z.string().optional(),
});

export type CreateReturnInput = z.infer<typeof CreateReturnSchema>;
