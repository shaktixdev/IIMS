# MODULE_PURCHASE.md — Purchase Orders & Vendor Management
## Industrial Inventory Management System (IIMS)

---

## Overview

Manages the full procurement lifecycle: vendor onboarding, purchase order creation/approval/tracking, and vendor performance analytics.

---

## Sub-Modules

1. Vendor Master
2. Purchase Orders (PO)
3. PO Approval Workflow
4. Vendor Performance

---

## File Structure

```
src/
├── app/(dashboard)/
│   ├── vendors/
│   │   ├── page.tsx             # Vendor list
│   │   └── [id]/page.tsx        # Vendor detail
│   └── purchase-orders/
│       ├── page.tsx             # PO list
│       ├── new/page.tsx         # Create PO
│       └── [id]/page.tsx        # PO detail
├── components/
│   └── purchase/
│       ├── VendorsTable.tsx
│       ├── VendorForm.tsx
│       ├── VendorDetailDrawer.tsx
│       ├── POTable.tsx
│       ├── POForm.tsx
│       ├── POLineItems.tsx
│       ├── POStatusTimeline.tsx
│       └── POApprovalBar.tsx
└── lib/
    ├── db/models/
    │   ├── Vendor.model.ts
    │   └── PurchaseOrder.model.ts
    └── services/
        ├── vendor.service.ts
        └── po.service.ts
```

---

## API Routes

### Vendors

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/vendors` | List vendors | All |
| POST | `/api/vendors` | Create vendor | MANAGE_VENDORS |
| GET | `/api/vendors/:id` | Vendor detail | All |
| PATCH | `/api/vendors/:id` | Update vendor | MANAGE_VENDORS |
| DELETE | `/api/vendors/:id` | Soft delete | MANAGE_VENDORS |
| GET | `/api/vendors/:id/pos` | POs by vendor | All |
| GET | `/api/vendors/:id/performance` | Performance metrics | All |

### Purchase Orders

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/purchase-orders` | List POs | All |
| POST | `/api/purchase-orders` | Create PO | CREATE_PO |
| GET | `/api/purchase-orders/:id` | PO detail | All |
| PATCH | `/api/purchase-orders/:id` | Update draft PO | CREATE_PO |
| POST | `/api/purchase-orders/:id/send` | Mark as sent to vendor | APPROVE_PO |
| POST | `/api/purchase-orders/:id/approve` | Approve PO | APPROVE_PO |
| POST | `/api/purchase-orders/:id/cancel` | Cancel PO | APPROVE_PO |
| GET | `/api/purchase-orders/:id/pdf` | Generate PO PDF | CREATE_PO |

### Query Params for GET `/api/purchase-orders`
```typescript
{
  page?:      number
  limit?:     number
  status?:    'draft' | 'sent' | 'partial' | 'received' | 'cancelled'
  vendor?:    string
  warehouse?: string
  dateFrom?:  string (ISO date)
  dateTo?:    string
  search?:    string (PO number)
}
```

---

## PO Lifecycle

```
[DRAFT] → [SENT] → [PARTIAL] → [RECEIVED]
             ↓
         [CANCELLED]

DRAFT:    Created, items added, not yet sent to vendor
SENT:     Emailed/dispatched to vendor, awaiting delivery
PARTIAL:  At least one GRN confirmed, but not all items received
RECEIVED: All quantities received (via GRN)
CANCELLED: Voided before or after sending
CLOSED:   Manually closed (e.g. vendor can't supply remaining)
```

---

## Create PO Flow

### Step 1: Header Info
```
- Vendor (searchable dropdown with create-new option)
- Receiving Warehouse
- Expected Delivery Date
- Reference / Quote Number
- Payment Terms
- Shipping Address (auto from warehouse, overridable)
```

### Step 2: Line Items
```
- Search item by SKU / name
- Enter quantity and unit
- Unit cost (auto-filled from last purchase price, editable)
- GST Rate (auto from item HSN code)
- Discount %
- System auto-calculates: subtotal, GST, net amount
- Add/remove rows dynamically
```

### Step 3: Summary & Notes
```
- Subtotal, Total GST, Total Discount, Grand Total
- Terms & conditions textarea
- Notes for vendor
- Internal notes
- Attachments upload
- [Save Draft] [Send to Vendor]
```

---

## PO PDF Generation

Using `@react-pdf/renderer`:

```
Header: Company logo, name, address, GSTIN
PO Details: PO Number, Date, Vendor, Delivery Date
Billing / Shipping Address blocks
Line Items Table: S.No, Item, Qty, Unit, Rate, GST%, Amount
Totals: Subtotal, Discount, GST, Total (in words)
Terms & Conditions
Signature block: Prepared by, Approved by
```

---

## Auto PO Generation (Reorder Trigger)

When a stock alert `low_stock` fires:
```
1. Check item.reorderQty > 0
2. Check item.preferredVendors[0] exists
3. Create a PO draft:
   - Vendor: preferredVendors[0]
   - Warehouse: current stock warehouse
   - Item: low stock item
   - Quantity: item.reorderQty
4. Create alert/notification for procurement officer
5. PO requires manual approval before sending
```

---

## Vendor Performance Metrics

Calculated from historical POs and GRNs:

```typescript
interface VendorPerformance {
  totalPOs:           number;
  totalValue:         number;
  onTimeDeliveries:   number;
  lateDeliveries:     number;
  onTimeRate:         number;    // %
  qualityAcceptance:  number;    // acceptedQty / receivedQty %
  rejectionRate:      number;    // %
  avgLeadTimeDays:    number;
  priceVariance:      number;    // avg deviation from quoted price
  rating:             number;    // 1-5 composite
}
```

---

## Validations

```typescript
export const CreateVendorSchema = z.object({
  name:           z.string().min(2).max(200),
  type:           z.enum(['manufacturer', 'distributor', 'trader', 'service']),
  contact: z.object({
    person:       z.string().optional(),
    phone:        z.string().optional(),
    email:        z.string().email().optional(),
  }),
  gstin:          z.string().length(15).optional(),
  paymentTerms:   z.string().optional(),
});

export const CreatePOSchema = z.object({
  vendor:         z.string().min(1),
  warehouse:      z.string().min(1),
  deliveryDate:   z.coerce.date(),
  items: z.array(z.object({
    item:         z.string().min(1),
    quantity:     z.number().positive(),
    unitCost:     z.number().min(0),
    gstRate:      z.number().min(0).max(100),
    discountPct:  z.number().min(0).max(100).default(0),
  })).min(1),
  notes:          z.string().optional(),
  terms:          z.string().optional(),
});
```

---

## UI: Vendor List Page

**Table Columns:** Code, Name, Type, Contact, GSTIN, Rating (stars), Active POs (count), Status, Actions

**Vendor Detail Page:**
- Left panel: Contact info, address, banking details (view/edit)
- Right panel: Tabs — PO History, Performance Charts, Supplied Items
- Performance tab: bar chart of on-time vs late, acceptance rate donut

---

## UI: PO List Page

**Table Columns:** PO Number, Vendor, Warehouse, Date, Delivery Date, Items (count), Total Amount, Status, Actions

**Status color mapping:**
```
draft:      gray
sent:       blue
partial:    amber
received:   green
cancelled:  red
closed:     muted
```

**PO Detail Page:**
- Status timeline at top (visual stepper)
- Header: vendor info card, dates, reference
- Line items table (read-only in non-draft states)
- GRNs linked to this PO (list below)
- [Download PDF] [Mark Received] [Cancel] buttons
- If partial: shows received vs pending per line item

---

## Alerts Triggered

| Trigger | Alert | Severity |
|---|---|---|
| PO delivery date passed, status = sent | `po_overdue` | warning |
| GRN raises quality rejection > 20% | `quality_issue` | warning |
| Vendor rating drops below 3 | `vendor_performance` | info |
| PO draft not approved within 3 days | `po_approval_pending` | info |
