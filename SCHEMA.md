# SCHEMA.md — MongoDB Database Schema
## Industrial Inventory Management System (IIMS)

---

## Overview

**Database:** MongoDB (Mongoose ODM)  
**Naming Convention:** camelCase fields, PascalCase model names  
**All documents include:** `createdAt`, `updatedAt` (via Mongoose timestamps)  
**Soft deletes:** `isDeleted: Boolean` + `deletedAt: Date` on destructive entities

---

## 1. User & Auth

### `users` Collection
```typescript
{
  _id:          ObjectId,
  name:         String (required),
  email:        String (required, unique, lowercase),
  password:     String (hashed, bcrypt),
  role:         Enum ['super_admin', 'admin', 'manager', 'store_keeper', 'procurement', 'viewer'],
  avatar:       String (URL, optional),
  phone:        String,
  department:   String,
  warehouseAccess: [ObjectId → warehouses],   // empty = all access
  isActive:     Boolean (default: true),
  lastLogin:    Date,
  preferences: {
    theme:      Enum ['dark', 'light'] (default: 'dark'),
    language:   String (default: 'en'),
    timezone:   String (default: 'Asia/Kolkata'),
    notifications: {
      lowStock:   Boolean (default: true),
      newPO:      Boolean (default: true),
      transfers:  Boolean (default: true),
    }
  },
  createdAt:    Date,
  updatedAt:    Date,
}
```

### `sessions` Collection (NextAuth)
```typescript
{
  _id:          ObjectId,
  sessionToken: String (unique),
  userId:       ObjectId → users,
  expires:      Date,
}
```

---

## 2. Organization / Setup

### `organizations` Collection
```typescript
{
  _id:          ObjectId,
  name:         String (required),
  logo:         String (URL),
  address:      {
    line1:      String,
    line2:      String,
    city:       String,
    state:      String,
    country:    String,
    pincode:    String,
  },
  gstin:        String,
  pan:          String,
  phone:        String,
  email:        String,
  currency:     String (default: 'INR'),
  fiscalYearStart: Number (1–12, default: 4),  // April
  createdAt:    Date,
  updatedAt:    Date,
}
```

### `warehouses` Collection
```typescript
{
  _id:          ObjectId,
  code:         String (unique, e.g. "WH-01"),
  name:         String (required),
  type:         Enum ['main', 'sub', 'transit', 'production', 'dispatch'],
  address:      {
    line1:      String,
    city:       String,
    state:      String,
    pincode:    String,
  },
  manager:      ObjectId → users,
  isActive:     Boolean (default: true),
  zones: [{
    _id:        ObjectId,
    code:       String,
    name:       String,
    rows:       Number,
    columns:    Number,
  }],
  createdAt:    Date,
  updatedAt:    Date,
}
```

---

## 3. Inventory Core

### `categories` Collection
```typescript
{
  _id:          ObjectId,
  name:         String (required),
  slug:         String (unique),
  parent:       ObjectId → categories (null = root),
  description:  String,
  attributes: [{    // custom attributes for items in this category
    name:       String,
    type:       Enum ['text', 'number', 'boolean', 'date', 'select'],
    options:    [String],  // for select type
    required:   Boolean,
    unit:       String,
  }],
  isActive:     Boolean,
  createdAt:    Date,
  updatedAt:    Date,
}
```

### `units` Collection
```typescript
{
  _id:          ObjectId,
  name:         String (required),     // e.g. "Kilogram"
  symbol:       String (required),     // e.g. "kg"
  type:         Enum ['weight', 'length', 'volume', 'area', 'count', 'time', 'other'],
  conversions: [{
    toUnit:     ObjectId → units,
    factor:     Number,  // multiply by this to convert
  }],
  isActive:     Boolean,
  createdAt:    Date,
  updatedAt:    Date,
}
```

### `items` Collection (Item Master)
```typescript
{
  _id:          ObjectId,
  sku:          String (unique, auto-generated, e.g. "ITM-20240001"),
  name:         String (required),
  description:  String,
  category:     ObjectId → categories (required),
  subcategory:  ObjectId → categories,
  unit:         ObjectId → units (required),
  purchaseUnit: ObjectId → units,  // unit used when buying
  conversionFactor: Number,        // purchaseUnit to unit ratio

  // Pricing
  costPrice:    Number (default: 0),
  lastPurchasePrice: Number,
  valuationMethod: Enum ['FIFO', 'FEFO', 'LIFO', 'AVERAGE'] (default: 'AVERAGE'),

  // Stock Settings
  minStockLevel:    Number (default: 0),   // reorder point
  maxStockLevel:    Number,
  reorderQty:       Number,
  leadTimeDays:     Number,

  // Physical
  weight:           Number,
  weightUnit:       ObjectId → units,
  dimensions: {
    length: Number,
    width:  Number,
    height: Number,
    unit:   String,
  },

  // Identification
  barcode:      String,
  hsnCode:      String,  // for GST
  partNumber:   String,
  brand:        String,
  model:        String,

  // Tracking
  isBatchTracked:   Boolean (default: false),
  isSerialTracked:  Boolean (default: false),
  hasExpiry:        Boolean (default: false),
  expiryAlertDays:  Number (default: 30),

  // Media
  images:       [String],  // URLs
  documents:    [{ name: String, url: String, type: String }],

  // Dynamic attributes (per category definition)
  attributes:   Map<String, Mixed>,

  // Preferred vendors
  preferredVendors: [ObjectId → vendors],

  isActive:     Boolean (default: true),
  isDeleted:    Boolean (default: false),
  deletedAt:    Date,

  createdBy:    ObjectId → users,
  updatedBy:    ObjectId → users,
  createdAt:    Date,
  updatedAt:    Date,
}
```

### `stock` Collection (Real-time Stock Levels)
```typescript
{
  _id:          ObjectId,
  item:         ObjectId → items (required),
  warehouse:    ObjectId → warehouses (required),
  zone:         String,    // zone code within warehouse
  bin:          String,    // bin/shelf location

  // Quantities
  quantityOnHand:    Number (default: 0),
  quantityReserved:  Number (default: 0),   // committed to outgoing orders
  quantityOnOrder:   Number (default: 0),   // pending PO
  quantityInTransit: Number (default: 0),   // inter-warehouse transfer

  // Derived (virtual)
  quantityAvailable: Number,  // onHand - reserved

  // Valuation
  totalValue:   Number,   // quantityOnHand × average cost
  averageCost:  Number,

  lastMovement: Date,
  lastCountDate: Date,

  createdAt:    Date,
  updatedAt:    Date,
}

// Compound Index: { item: 1, warehouse: 1 } unique
```

### `batches` Collection (Batch/Lot Tracking)
```typescript
{
  _id:          ObjectId,
  batchNumber:  String (required, unique per item),
  item:         ObjectId → items,
  warehouse:    ObjectId → warehouses,
  quantity:     Number,
  remainingQty: Number,
  manufacturingDate: Date,
  expiryDate:   Date,
  supplier:     ObjectId → vendors,
  receivedDate: Date,
  costPrice:    Number,
  status:       Enum ['active', 'quarantine', 'expired', 'consumed'],
  notes:        String,
  createdAt:    Date,
  updatedAt:    Date,
}
```

### `serialNumbers` Collection
```typescript
{
  _id:          ObjectId,
  serialNumber: String (required),
  item:         ObjectId → items,
  batch:        ObjectId → batches,
  warehouse:    ObjectId → warehouses,
  status:       Enum ['in_stock', 'reserved', 'issued', 'returned', 'scrapped'],
  receivedDate: Date,
  issuedDate:   Date,
  issuedTo:     String,
  notes:        String,
  createdAt:    Date,
  updatedAt:    Date,
}
```

---

## 4. Stock Movements

### `stockMovements` Collection (Audit Trail)
```typescript
{
  _id:              ObjectId,
  movementNumber:   String (auto, e.g. "MOV-2024-00001"),
  type:             Enum [
    'grn',          // Goods Receipt Note (inbound from supplier)
    'issue',        // Stock Issue (outbound to production/dept)
    'transfer_out', // Inter-warehouse OUT
    'transfer_in',  // Inter-warehouse IN
    'adjustment',   // Manual adjustment
    'return_in',    // Customer/dept return
    'return_out',   // Return to vendor
    'opening',      // Opening stock entry
  ],
  item:             ObjectId → items,
  warehouse:        ObjectId → warehouses,
  zone:             String,
  bin:              String,

  quantity:         Number,   // positive = in, negative = out
  unitCost:         Number,
  totalValue:       Number,

  // Before/After snapshots
  stockBefore:      Number,
  stockAfter:       Number,

  // Reference documents
  reference: {
    type:     Enum ['grn', 'po', 'transfer', 'issue_voucher', 'adjustment', 'manual'],
    id:       ObjectId,
    number:   String,
  },

  batch:            ObjectId → batches,
  serialNumbers:    [ObjectId → serialNumbers],

  remarks:          String,
  performedBy:      ObjectId → users,
  approvedBy:       ObjectId → users,
  performedAt:      Date,

  createdAt:        Date,
  updatedAt:        Date,
}
```

---

## 5. Purchase

### `vendors` Collection
```typescript
{
  _id:            ObjectId,
  code:           String (unique, e.g. "VND-001"),
  name:           String (required),
  type:           Enum ['manufacturer', 'distributor', 'trader', 'service'],
  contact: {
    person:       String,
    phone:        String,
    email:        String,
    alternatePhone: String,
  },
  address: {
    line1:        String,
    city:         String,
    state:        String,
    country:      String,
    pincode:      String,
  },
  gstin:          String,
  pan:            String,
  bankDetails: {
    bankName:     String,
    accountNumber: String,
    ifscCode:     String,
    accountHolder: String,
  },
  paymentTerms:   String,   // e.g. "Net 30"
  creditLimit:    Number,
  rating:         Number (1–5),
  notes:          String,
  items:          [ObjectId → items],   // items supplied by this vendor
  isActive:       Boolean (default: true),
  isDeleted:      Boolean,
  createdBy:      ObjectId → users,
  createdAt:      Date,
  updatedAt:      Date,
}
```

### `purchaseOrders` Collection
```typescript
{
  _id:            ObjectId,
  poNumber:       String (auto, e.g. "PO-2024-00001"),
  status:         Enum ['draft', 'sent', 'partial', 'received', 'cancelled', 'closed'],
  vendor:         ObjectId → vendors,
  warehouse:      ObjectId → warehouses,  // receiving warehouse

  deliveryDate:   Date,
  validUntil:     Date,

  items: [{
    item:         ObjectId → items,
    description:  String,
    quantity:     Number,
    receivedQty:  Number (default: 0),
    unitCost:     Number,
    totalCost:    Number,
    unit:         ObjectId → units,
    hsnCode:      String,
    gstRate:      Number,  // %
    gstAmount:    Number,
    discountPct:  Number,
    discountAmt:  Number,
    netAmount:    Number,
    notes:        String,
  }],

  // Totals
  subtotal:       Number,
  totalDiscount:  Number,
  totalGst:       Number,
  totalAmount:    Number,

  currency:       String (default: 'INR'),
  exchangeRate:   Number (default: 1),

  terms:          String,
  notes:          String,
  attachments:    [{ name: String, url: String }],

  approvedBy:     ObjectId → users,
  approvedAt:     Date,
  sentAt:         Date,

  createdBy:      ObjectId → users,
  updatedBy:      ObjectId → users,
  createdAt:      Date,
  updatedAt:      Date,
}
```

### `goodsReceiptNotes` Collection (GRN)
```typescript
{
  _id:            ObjectId,
  grnNumber:      String (auto, e.g. "GRN-2024-00001"),
  purchaseOrder:  ObjectId → purchaseOrders,
  vendor:         ObjectId → vendors,
  warehouse:      ObjectId → warehouses,
  status:         Enum ['draft', 'confirmed', 'voided'],

  receivedDate:   Date,
  invoiceNumber:  String,
  invoiceDate:    Date,
  vehicleNumber:  String,
  dcNumber:       String,  // Delivery Challan

  items: [{
    item:         ObjectId → items,
    poItem:       ObjectId,  // ref to PO line item
    expectedQty:  Number,
    receivedQty:  Number,
    acceptedQty:  Number,
    rejectedQty:  Number,
    rejectionReason: String,
    unit:         ObjectId → units,
    unitCost:     Number,
    batchNumber:  String,
    expiryDate:   Date,
    serialNumbers: [String],
    zone:         String,
    bin:          String,
  }],

  notes:          String,
  attachments:    [{ name: String, url: String }],

  createdBy:      ObjectId → users,
  confirmedBy:    ObjectId → users,
  confirmedAt:    Date,
  createdAt:      Date,
  updatedAt:      Date,
}
```

---

## 6. Issue & Dispatch

### `issueVouchers` Collection
```typescript
{
  _id:            ObjectId,
  voucherNumber:  String (auto, e.g. "IV-2024-00001"),
  type:           Enum ['internal', 'production', 'dispatch', 'return'],
  status:         Enum ['draft', 'approved', 'issued', 'cancelled'],
  warehouse:      ObjectId → warehouses,

  issuedTo:       String,  // department, project, person
  purpose:        String,
  requestedBy:    String,
  project:        String,

  items: [{
    item:         ObjectId → items,
    requestedQty: Number,
    issuedQty:    Number,
    unit:         ObjectId → units,
    batch:        ObjectId → batches,
    serialNumbers: [ObjectId → serialNumbers],
    zone:         String,
    bin:          String,
    notes:        String,
  }],

  approvedBy:     ObjectId → users,
  approvedAt:     Date,
  issuedBy:       ObjectId → users,
  issuedAt:       Date,
  notes:          String,

  createdBy:      ObjectId → users,
  createdAt:      Date,
  updatedAt:      Date,
}
```

---

## 7. Transfers

### `transfers` Collection (Inter-Warehouse)
```typescript
{
  _id:              ObjectId,
  transferNumber:   String (auto, e.g. "TRF-2024-00001"),
  status:           Enum ['draft', 'in_transit', 'received', 'cancelled', 'partial'],

  fromWarehouse:    ObjectId → warehouses,
  toWarehouse:      ObjectId → warehouses,

  expectedDate:     Date,
  dispatchDate:     Date,
  receivedDate:     Date,

  vehicleNumber:    String,
  driverName:       String,
  driverPhone:      String,

  items: [{
    item:           ObjectId → items,
    requestedQty:   Number,
    dispatchedQty:  Number,
    receivedQty:    Number,
    unit:           ObjectId → units,
    batch:          ObjectId → batches,
    serialNumbers:  [ObjectId → serialNumbers],
    fromZone:       String,
    fromBin:        String,
    toZone:         String,
    toBin:          String,
    notes:          String,
  }],

  notes:            String,
  attachments:      [{ name: String, url: String }],

  createdBy:        ObjectId → users,
  dispatchedBy:     ObjectId → users,
  receivedBy:       ObjectId → users,
  createdAt:        Date,
  updatedAt:        Date,
}
```

---

## 8. Alerts & Notifications

### `alerts` Collection
```typescript
{
  _id:          ObjectId,
  type:         Enum [
    'low_stock', 'out_of_stock', 'overstock',
    'expiry_warning', 'po_overdue', 'grn_pending',
    'transfer_delayed', 'price_variance'
  ],
  severity:     Enum ['info', 'warning', 'critical'],
  title:        String,
  message:      String,
  relatedEntity: {
    type:       Enum ['item', 'po', 'grn', 'transfer', 'batch'],
    id:         ObjectId,
    reference:  String,
  },
  warehouse:    ObjectId → warehouses,
  isRead:       Boolean (default: false),
  isResolved:   Boolean (default: false),
  resolvedBy:   ObjectId → users,
  resolvedAt:   Date,
  createdAt:    Date,
}
```

---

## 9. Settings

### `settings` Collection
```typescript
{
  _id:            ObjectId,
  key:            String (unique),  // e.g. "po.autoNumberFormat"
  value:          Mixed,
  description:    String,
  group:          Enum ['general', 'inventory', 'purchase', 'alerts', 'notifications'],
  updatedBy:      ObjectId → users,
  updatedAt:      Date,
}
```

---

## 10. Indexes

```javascript
// items
db.items.createIndex({ sku: 1 }, { unique: true })
db.items.createIndex({ barcode: 1 })
db.items.createIndex({ name: "text", description: "text" })
db.items.createIndex({ category: 1, isActive: 1 })

// stock
db.stock.createIndex({ item: 1, warehouse: 1 }, { unique: true })
db.stock.createIndex({ quantityOnHand: 1 })
db.stock.createIndex({ warehouse: 1 })

// stockMovements
db.stockMovements.createIndex({ item: 1, performedAt: -1 })
db.stockMovements.createIndex({ warehouse: 1, performedAt: -1 })
db.stockMovements.createIndex({ type: 1, performedAt: -1 })
db.stockMovements.createIndex({ "reference.id": 1 })

// purchaseOrders
db.purchaseOrders.createIndex({ poNumber: 1 }, { unique: true })
db.purchaseOrders.createIndex({ vendor: 1, status: 1 })
db.purchaseOrders.createIndex({ createdAt: -1 })

// alerts
db.alerts.createIndex({ isRead: 1, isResolved: 1, createdAt: -1 })
db.alerts.createIndex({ "relatedEntity.id": 1 })
```

---

## 11. Naming Conventions for Auto Numbers

```
Items:            ITM-{YEAR}{SEQ:5}     e.g. ITM-2400001
Purchase Orders:  PO-{YEAR}-{SEQ:5}    e.g. PO-2024-00001
GRNs:             GRN-{YEAR}-{SEQ:5}   e.g. GRN-2024-00001
Issue Vouchers:   IV-{YEAR}-{SEQ:5}    e.g. IV-2024-00001
Transfers:        TRF-{YEAR}-{SEQ:5}   e.g. TRF-2024-00001
Stock Movements:  MOV-{YEAR}-{SEQ:5}   e.g. MOV-2024-00001
Vendors:          VND-{SEQ:3}          e.g. VND-001
Warehouses:       WH-{SEQ:2}           e.g. WH-01
```
