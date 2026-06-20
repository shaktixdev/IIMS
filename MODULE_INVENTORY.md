# MODULE_INVENTORY.md — Inventory Management Module
## Industrial Inventory Management System (IIMS)

---

## Overview

Core module for managing the Item Master, real-time stock levels, stock-in (GRN), stock-out (Issue Vouchers), manual adjustments, and opening stock entries.

---

## Sub-Modules

1. Item Master (CRUD for products/materials)
2. Stock Levels (real-time per warehouse)
3. Goods Receipt Note — GRN (stock-in)
4. Issue Voucher (stock-out)
5. Stock Adjustment (corrections)
6. Opening Stock Entry
7. Barcode Scanning

---

## File Structure

```
src/
├── app/(dashboard)/
│   └── inventory/
│       ├── page.tsx                    # Item list
│       ├── [id]/
│       │   └── page.tsx               # Item detail
│       ├── new/
│       │   └── page.tsx               # Add item
│       ├── grn/
│       │   ├── page.tsx               # GRN list
│       │   └── [id]/page.tsx          # GRN detail / new
│       ├── issues/
│       │   ├── page.tsx               # Issue voucher list
│       │   └── [id]/page.tsx
│       └── adjustments/
│           └── page.tsx
├── components/
│   └── inventory/
│       ├── ItemsTable.tsx
│       ├── ItemForm.tsx
│       ├── ItemDetailDrawer.tsx
│       ├── StockByWarehouse.tsx
│       ├── StockHistoryTable.tsx
│       ├── GRNForm.tsx
│       ├── GRNLineItems.tsx
│       ├── IssueVoucherForm.tsx
│       ├── AdjustmentForm.tsx
│       ├── BarcodeScanner.tsx
│       └── StockStatusCard.tsx
└── lib/
    ├── db/models/
    │   ├── Item.model.ts
    │   ├── Stock.model.ts
    │   ├── StockMovement.model.ts
    │   ├── GRN.model.ts
    │   ├── IssueVoucher.model.ts
    │   └── Batch.model.ts
    └── services/
        ├── inventory.service.ts
        ├── stock.service.ts
        └── grn.service.ts
```

---

## API Routes

### Items

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/items` | List items (paginated, filtered) | All authenticated |
| POST | `/api/items` | Create item | MANAGE_ITEMS |
| GET | `/api/items/:id` | Get item detail | All authenticated |
| PATCH | `/api/items/:id` | Update item | MANAGE_ITEMS |
| DELETE | `/api/items/:id` | Soft delete item | DELETE_ITEMS |
| GET | `/api/items/:id/stock` | Stock levels across warehouses | All authenticated |
| GET | `/api/items/:id/movements` | Movement history | All authenticated |
| POST | `/api/items/import` | Bulk import via CSV | MANAGE_ITEMS |
| GET | `/api/items/export` | Export to Excel | EXPORT_DATA |
| GET | `/api/items/search` | Fast SKU/name search | All authenticated |

### Query Parameters for GET `/api/items`
```typescript
{
  page?:        number (default: 1)
  limit?:       number (default: 25, max: 100)
  search?:      string  (searches name, SKU, barcode)
  category?:    string  (category ID)
  warehouse?:   string  (warehouse ID — filters stock)
  status?:      'in_stock' | 'low_stock' | 'out_of_stock' | 'all'
  sortBy?:      'name' | 'sku' | 'stock' | 'createdAt'
  sortOrder?:   'asc' | 'desc'
  isActive?:    boolean
}
```

### Stock

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stock` | All stock (filtered) |
| GET | `/api/stock/low` | Low-stock items |
| GET | `/api/stock/valuation` | Stock valuation report |

### GRN (Goods Receipt Note)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/grn` | List GRNs | CREATE_GRN |
| POST | `/api/grn` | Create GRN draft | CREATE_GRN |
| GET | `/api/grn/:id` | GRN detail | CREATE_GRN |
| PATCH | `/api/grn/:id` | Update GRN draft | CREATE_GRN |
| POST | `/api/grn/:id/confirm` | Confirm GRN → updates stock | APPROVE_GRN |
| POST | `/api/grn/:id/void` | Void GRN | APPROVE_GRN |

**GRN Confirm Flow (Server Action / Route Handler):**
```
1. Validate GRN is in 'draft' status
2. For each line item:
   a. Check item exists and is active
   b. Upsert `stock` document (item + warehouse)
   c. Increment quantityOnHand by acceptedQty
   d. Create `stockMovement` record (type: 'grn')
   e. If batch-tracked: create/update `batch` document
   f. If serial-tracked: create `serialNumber` documents
3. Update GRN status to 'confirmed'
4. Update PO receivedQty + status
5. Emit real-time stock update via WebSocket
6. Check if any items now above reorder → resolve alerts
```

### Issue Vouchers

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/issues` | List issue vouchers | All |
| POST | `/api/issues` | Create issue voucher | ISSUE_STOCK |
| GET | `/api/issues/:id` | Detail | All |
| POST | `/api/issues/:id/approve` | Approve + deduct stock | APPROVE_GRN |
| POST | `/api/issues/:id/cancel` | Cancel | ISSUE_STOCK |

**Stock Deduction Flow:**
```
1. Check stock availability (quantityAvailable >= issuedQty)
2. If batch-tracked: deduct from FIFO/FEFO batch
3. Decrement stock.quantityOnHand
4. Create stockMovement (type: 'issue')
5. Update issueVoucher status to 'issued'
```

### Adjustments

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| POST | `/api/adjustments` | Create adjustment | STOCK_ADJUSTMENT |
| GET | `/api/adjustments` | Adjustment history | STOCK_ADJUSTMENT |

**Adjustment types:**
- `increase` — add stock (found excess, damaged restored)
- `decrease` — remove stock (damaged, lost)
- `recount` — set absolute stock level (after physical count)

---

## Services

### `inventory.service.ts`
```typescript
// Key functions
generateSKU(categoryCode: string): Promise<string>
searchItems(query: string, filters: ItemFilters): Promise<PaginatedItems>
getItemWithStock(itemId: string): Promise<ItemWithStock>
importItems(csvData: ItemRow[]): Promise<ImportResult>
```

### `stock.service.ts`
```typescript
// Key functions
getStockLevel(itemId: string, warehouseId: string): Promise<Stock>
updateStock(params: StockUpdateParams): Promise<Stock>
getLowStockItems(warehouseId?: string): Promise<LowStockItem[]>
getStockValuation(warehouseId?: string): Promise<ValuationResult>
checkAvailability(itemId: string, warehouseId: string, qty: number): Promise<boolean>
```

### `grn.service.ts`
```typescript
// Key functions
createGRN(data: CreateGRNDto): Promise<GRN>
confirmGRN(grnId: string, userId: string): Promise<GRNConfirmResult>
voidGRN(grnId: string, reason: string): Promise<void>
```

---

## UI Pages & Components

### Item List Page (`/inventory`)
**Features:**
- Data table with columns: SKU, Name, Category, Unit, Stock (total), Status, Last Movement, Actions
- Filter panel: Category tree, Warehouse, Status, Brand
- Search: real-time as user types (debounced 300ms)
- Bulk actions: Export selected, Change category, Deactivate
- Quick-view drawer: click row → see stock breakdown by warehouse
- "Add Item" button → navigate to `/inventory/new`
- "Import" button → CSV upload modal
- Stock status column uses colored badge component

### Item Detail Page (`/inventory/[id]`)
**Layout:**
```
[Item Name]  [Status Badge]   [Edit]  [...]
─────────────────────────────────────────────
Left (60%):          Right (40%):
  Overview tab         Stock by Warehouse
  Stock History tab    [Warehouse] [Zone] [Qty]
  PO History tab
  Attachments tab
```

**Overview tab:**
- Item attributes, pricing, tracking settings
- Inline edit (click field to edit, save on blur)

**Stock History tab:**
- Timeline of movements: date, type, qty, user, reference
- Filter by type, date range
- Export to Excel

### GRN Form (`/inventory/grn/new`)
**Wizard Steps:**
```
Step 1: Header
  - Warehouse (dropdown)
  - Purchase Order (optional link to PO)
  - Vendor, Invoice No, Invoice Date, Vehicle No
  - Received Date

Step 2: Line Items
  - Add items via SKU search or barcode scan
  - For each: Expected Qty (from PO if linked), Received Qty, 
    Accepted Qty, Rejected Qty, Unit Cost, Batch No, Expiry
  - Discrepancy highlighted if received ≠ expected

Step 3: Review & Confirm
  - Summary of all items
  - Total value
  - Remarks
  - [Save Draft] [Confirm & Update Stock]
```

### Issue Voucher Form
- Select warehouse, issued-to department/project
- Add items via search/barcode
- Quantity input (validates against available stock, shows real-time remaining)
- Batch selection if item is batch-tracked

### Barcode Scanner Component
```typescript
// Uses @zxing/browser for webcam scanning
// Also accepts USB scanner input (keyboard HID)
// On scan: auto-searches item by barcode
// Adds to current form's line items
```

---

## Real-Time Stock Updates

```typescript
// On GRN confirm or Issue approve:
// Server emits via Socket.io:
socket.to(`warehouse:${warehouseId}`).emit('stock:updated', {
  itemId,
  warehouseId,
  newQuantity,
  movementType,
});

// Dashboard and item detail pages listen:
socket.on('stock:updated', (data) => {
  // Update SWR cache or Zustand store
  mutate(`/api/stock/${data.itemId}`);
});
```

---

## Validations (Zod Schemas)

```typescript
// CreateItemSchema
export const CreateItemSchema = z.object({
  name:           z.string().min(2).max(200),
  category:       z.string().min(1),
  unit:           z.string().min(1),
  costPrice:      z.number().min(0).optional(),
  minStockLevel:  z.number().min(0).optional(),
  maxStockLevel:  z.number().min(0).optional(),
  reorderQty:     z.number().min(0).optional(),
  barcode:        z.string().optional(),
  hsnCode:        z.string().optional(),
  isBatchTracked: z.boolean().default(false),
  isSerialTracked:z.boolean().default(false),
  hasExpiry:      z.boolean().default(false),
});

// CreateGRNSchema
export const CreateGRNSchema = z.object({
  warehouse:      z.string().min(1),
  purchaseOrder:  z.string().optional(),
  vendor:         z.string().min(1),
  receivedDate:   z.coerce.date(),
  invoiceNumber:  z.string().optional(),
  items: z.array(z.object({
    item:         z.string().min(1),
    receivedQty:  z.number().min(0),
    acceptedQty:  z.number().min(0),
    rejectedQty:  z.number().min(0),
    unitCost:     z.number().min(0),
    batchNumber:  z.string().optional(),
    expiryDate:   z.coerce.date().optional(),
  })).min(1),
});
```

---

## Stock Valuation Logic

```typescript
// AVERAGE COST METHOD (default)
newAverageCost = 
  (currentQty * currentAvgCost + receivedQty * unitCost) / 
  (currentQty + receivedQty);

// FIFO: maintain ordered list of batches, deduct oldest first
// FEFO: sort by expiry date, deduct earliest expiry first
// LIFO: deduct most recently received first
```

---

## Alerts Triggered by This Module

| Trigger | Alert Type | Severity |
|---|---|---|
| Stock < minStockLevel | `low_stock` | warning |
| Stock = 0 | `out_of_stock` | critical |
| Stock > maxStockLevel | `overstock` | info |
| Batch expiry within expiryAlertDays | `expiry_warning` | warning |
| GRN has rejected items | `grn_discrepancy` | warning |
