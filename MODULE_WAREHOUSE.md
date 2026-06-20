# MODULE_WAREHOUSE.md — Warehouse & Transfer Management
## Industrial Inventory Management System (IIMS)

---

## Overview

Manages multi-warehouse setup including zones, bins, inter-warehouse stock transfers, and physical inventory counting.

---

## Sub-Modules

1. Warehouse Setup & Configuration
2. Zone / Bin Management
3. Inter-Warehouse Transfers
4. Physical Stock Count / Cycle Count

---

## File Structure

```
src/
├── app/(dashboard)/
│   ├── warehouses/
│   │   ├── page.tsx              # Warehouse list
│   │   └── [id]/
│   │       ├── page.tsx          # Warehouse dashboard
│   │       └── zones/page.tsx    # Zone management
│   └── transfers/
│       ├── page.tsx              # Transfer list
│       ├── new/page.tsx          # Create transfer
│       └── [id]/page.tsx         # Transfer detail
├── components/
│   └── warehouse/
│       ├── WarehouseCard.tsx
│       ├── WarehouseForm.tsx
│       ├── ZoneManager.tsx
│       ├── BinLocator.tsx
│       ├── TransferForm.tsx
│       ├── TransferLineItems.tsx
│       ├── TransferStatusBar.tsx
│       └── StockCountForm.tsx
└── lib/
    ├── db/models/
    │   ├── Warehouse.model.ts
    │   └── Transfer.model.ts
    └── services/
        ├── warehouse.service.ts
        └── transfer.service.ts
```

---

## API Routes

### Warehouses

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/warehouses` | List warehouses | All |
| POST | `/api/warehouses` | Create warehouse | MANAGE_SETTINGS |
| GET | `/api/warehouses/:id` | Warehouse detail | All |
| PATCH | `/api/warehouses/:id` | Update warehouse | MANAGE_SETTINGS |
| GET | `/api/warehouses/:id/stock` | All stock in warehouse | All |
| GET | `/api/warehouses/:id/stats` | KPI stats for warehouse | All |
| POST | `/api/warehouses/:id/zones` | Add zone | MANAGE_SETTINGS |
| PATCH | `/api/warehouses/:id/zones/:zoneId` | Update zone | MANAGE_SETTINGS |
| DELETE | `/api/warehouses/:id/zones/:zoneId` | Remove zone | MANAGE_SETTINGS |

### Transfers

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/transfers` | List transfers | All |
| POST | `/api/transfers` | Create transfer | CREATE_TRANSFER (= ISSUE_STOCK) |
| GET | `/api/transfers/:id` | Transfer detail | All |
| PATCH | `/api/transfers/:id` | Update draft | CREATE_TRANSFER |
| POST | `/api/transfers/:id/dispatch` | Mark dispatched (deducts source) | CREATE_TRANSFER |
| POST | `/api/transfers/:id/receive` | Mark received (adds to destination) | CREATE_TRANSFER |
| POST | `/api/transfers/:id/cancel` | Cancel | STOCK_ADJUSTMENT |

---

## Transfer Lifecycle

```
[DRAFT] → [IN_TRANSIT] → [RECEIVED]
              ↓
          [PARTIAL]      (some items received)
              ↓
          [RECEIVED]
[DRAFT/IN_TRANSIT] → [CANCELLED]
```

### Dispatch Flow (deducts source warehouse)
```
1. Validate transfer is in 'draft' status
2. For each item:
   a. Check source stock availability
   b. Deduct from source: stock.quantityOnHand -= dispatchedQty
   c. Add to source: stock.quantityInTransit += dispatchedQty
   d. Create stockMovement (type: 'transfer_out', warehouse: source)
3. Update transfer status → 'in_transit'
4. Update transfer.dispatchDate
5. Emit real-time event
```

### Receive Flow (adds to destination warehouse)
```
1. Validate transfer is 'in_transit'
2. For each item:
   a. Deduct from source: stock.quantityInTransit -= receivedQty
   b. Add to destination: stock.quantityOnHand += receivedQty
   c. Create stockMovement (type: 'transfer_in', warehouse: destination)
   d. Handle partial: if receivedQty < dispatchedQty → track discrepancy
3. Update transfer status → 'received' or 'partial'
4. Check if destination stock now above reorder → resolve low_stock alert
```

---

## Warehouse Dashboard (`/warehouses/[id]`)

```
┌─────────────────────────────────────────────────────┐
│  Warehouse Name   [Type Badge]   [Edit]              │
│  Address · Manager                                   │
├─────────────────────────────────────────────────────┤
│  [Total SKUs]  [Total Qty]  [Total Value]  [Pending] │
├─────────────────────────────────────────────────────┤
│  Stock Table          │  Zone Map (visual grid)      │
│  Item / Qty / Zone    │  Click zone → filter table   │
│  Status badges        │                              │
├─────────────────────────────────────────────────────┤
│  Recent Movements (last 20)                          │
│  In/Out/Transfer timeline                            │
└─────────────────────────────────────────────────────┘
```

---

## Zone & Bin System

```
Warehouse
  └── Zone (e.g. "A", "Cold Storage", "Raw Materials")
        └── Row (A1, A2, A3...)
              └── Bin (A1-01, A1-02...)
```

Bin location stored as string: `{zone}-{row}-{bin}` e.g. `A-3-12`

**Zone Manager UI:**
- Visual grid representation of zones
- Add/rename/delete zones
- Assign items to zones (optional — for guided putaway)
- Color coding by zone type

---

## Inter-Warehouse Transfer Form

### Step 1: Header
```
- From Warehouse (user's accessible warehouses)
- To Warehouse (different from source)
- Expected Delivery Date
- Vehicle Number / Transporter
- Driver Name & Phone
- Reference Notes
```

### Step 2: Items
```
- Search item (filters by in-stock in source warehouse)
- Shows: Available Qty in source, Reserved Qty
- Enter: Dispatch Quantity
- From Zone/Bin (auto-filled, editable)
- To Zone/Bin in destination (optional)
- If batch-tracked: select batch
```

### Step 3: Review
```
- Summary table
- Total items, total estimated value
- [Save Draft] [Confirm & Dispatch]
```

---

## Physical Stock Count

```typescript
// Flow:
// 1. Initiate count for a warehouse (or zone)
// 2. System takes snapshot of current stock
// 3. Warehouse staff enters physical count (item by item or via scan)
// 4. System shows variance: system qty vs counted qty
// 5. Supervisor reviews and approves adjustments
// 6. On approval: adjustments applied as stockMovements (type: 'adjustment')

interface StockCount {
  _id:            ObjectId;
  warehouse:      ObjectId;
  zone?:          string;
  status:         'draft' | 'in_progress' | 'completed' | 'approved';
  startedAt:      Date;
  completedAt?:   Date;
  items: {
    item:         ObjectId;
    systemQty:    number;
    countedQty:   number;
    variance:     number;
    notes:        string;
  }[];
  createdBy:      ObjectId;
  approvedBy?:    ObjectId;
}
```

---

## Multi-Warehouse Stock Visibility

```
GET /api/stock?groupBy=warehouse

Response:
{
  warehouses: [
    {
      warehouse: { id, name, code },
      totalSKUs: 450,
      totalValue: 2340000,
      lowStockCount: 12,
      outOfStockCount: 3,
      inTransitCount: 5,
    }
  ]
}
```

---

## Validations

```typescript
export const CreateWarehouseSchema = z.object({
  name:     z.string().min(2).max(100),
  type:     z.enum(['main', 'sub', 'transit', 'production', 'dispatch']),
  address:  z.object({
    line1:  z.string(),
    city:   z.string(),
    state:  z.string(),
    pincode:z.string(),
  }),
  manager:  z.string().optional(),
});

export const CreateTransferSchema = z.object({
  fromWarehouse:  z.string().min(1),
  toWarehouse:    z.string().min(1),
  expectedDate:   z.coerce.date(),
  items: z.array(z.object({
    item:         z.string(),
    dispatchedQty:z.number().positive(),
    fromZone:     z.string().optional(),
    batch:        z.string().optional(),
  })).min(1),
}).refine(
  (data) => data.fromWarehouse !== data.toWarehouse,
  { message: "Source and destination warehouses must be different" }
);
```

---

## Alerts Triggered

| Trigger | Alert | Severity |
|---|---|---|
| Transfer not received by expectedDate | `transfer_delayed` | warning |
| Transfer received with shortage | `transfer_discrepancy` | warning |
| Stock count variance > 5% on any item | `count_discrepancy` | warning |
