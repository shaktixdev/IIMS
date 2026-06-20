# API_REFERENCE.md — Complete API Reference
## Industrial Inventory Management System (IIMS)

---

## Base URL
```
Development:  http://localhost:3000/api
Production:   https://yourdomain.com/api
```

## Authentication

All routes require a valid session cookie (set by NextAuth on login).  
For programmatic access: Bearer token via API key (Phase 2).

```
Cookie: next-auth.session-token=<jwt>
```

---

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 1204,
    "totalPages": 49
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You don't have permission to perform this action",
    "details": []
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|---|---|---|
| UNAUTHORIZED | 401 | Not logged in |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 422 | Request body validation failed |
| CONFLICT | 409 | Duplicate resource |
| INTERNAL_ERROR | 500 | Server error |

---

## Items API

### `GET /api/items`
List all items with pagination.

**Query Parameters:**
```
page        integer   default: 1
limit       integer   default: 25, max: 100
search      string    search name, SKU, barcode
category    ObjectId  filter by category
warehouse   ObjectId  include stock data for warehouse
status      string    'in_stock' | 'low_stock' | 'out_of_stock'
isActive    boolean
sortBy      string    'name' | 'sku' | 'createdAt'
sortOrder   string    'asc' | 'desc'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6789012345",
      "sku": "ITM-2400001",
      "name": "Bolt M6 x 30mm",
      "category": { "_id": "...", "name": "Fasteners" },
      "unit": { "_id": "...", "name": "Pieces", "symbol": "pcs" },
      "costPrice": 2.50,
      "minStockLevel": 500,
      "stock": {
        "quantityOnHand": 1250,
        "quantityAvailable": 1100,
        "status": "in_stock"
      }
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 450 }
}
```

---

### `POST /api/items`
Create a new item.

**Request Body:**
```json
{
  "name": "Bolt M6 x 30mm",
  "category": "65a1b2c3d4e5f6789012345",
  "unit": "65a1b2c3d4e5f6789012346",
  "costPrice": 2.50,
  "minStockLevel": 500,
  "maxStockLevel": 5000,
  "reorderQty": 1000,
  "barcode": "8901234567890",
  "hsnCode": "73181500",
  "isBatchTracked": false,
  "hasExpiry": false
}
```

---

### `GET /api/items/:id`
Get item with stock and recent movements.

---

### `GET /api/items/:id/movements`
**Query Parameters:**
```
type      string    filter by movement type
dateFrom  ISO date
dateTo    ISO date
page      integer
limit     integer
```

---

### `POST /api/items/import`
Bulk import via CSV/Excel.

**Request:** `multipart/form-data` with file field.

**CSV columns:**
```
name*, category*, unit*, costPrice, minStockLevel, maxStockLevel,
reorderQty, barcode, hsnCode, brand, model, partNumber
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 145,
    "skipped": 3,
    "errors": [
      { "row": 24, "error": "Category not found: 'Valves'" }
    ]
  }
}
```

---

## Stock API

### `GET /api/stock`
**Query Parameters:**
```
warehouse   ObjectId
item        ObjectId
status      string    'low_stock' | 'out_of_stock' | 'in_stock'
```

---

## GRN API

### `POST /api/grn`
Create GRN draft.

**Request Body:**
```json
{
  "warehouse": "65a1...",
  "purchaseOrder": "65a1...",
  "vendor": "65a1...",
  "receivedDate": "2024-01-15",
  "invoiceNumber": "INV/2024/001",
  "vehicleNumber": "JH02AB1234",
  "items": [
    {
      "item": "65a1...",
      "receivedQty": 500,
      "acceptedQty": 490,
      "rejectedQty": 10,
      "rejectionReason": "Dimensional variance",
      "unitCost": 2.50,
      "batchNumber": "BTH-240001",
      "zone": "A",
      "bin": "A-2-05"
    }
  ]
}
```

---

### `POST /api/grn/:id/confirm`
Confirms GRN and updates stock. No request body required.

**Response:**
```json
{
  "success": true,
  "data": {
    "grnId": "65a1...",
    "stockUpdates": [
      {
        "item": "Bolt M6",
        "warehouse": "Main Warehouse",
        "previousQty": 1000,
        "addedQty": 490,
        "newQty": 1490
      }
    ]
  }
}
```

---

## Purchase Orders API

### `POST /api/purchase-orders`

**Request Body:**
```json
{
  "vendor": "65a1...",
  "warehouse": "65a1...",
  "deliveryDate": "2024-02-01",
  "items": [
    {
      "item": "65a1...",
      "quantity": 1000,
      "unitCost": 2.50,
      "gstRate": 18,
      "discountPct": 2
    }
  ],
  "terms": "Net 30 days",
  "notes": "Urgent requirement"
}
```

---

### `GET /api/purchase-orders/:id/pdf`
Returns PDF binary.

**Response Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="PO-2024-00001.pdf"
```

---

## Transfers API

### `POST /api/transfers/:id/dispatch`
Deducts stock from source and marks in transit.

**Request Body:**
```json
{
  "vehicleNumber": "JH01XY5678",
  "driverName": "Ramesh Kumar",
  "driverPhone": "9876543210",
  "items": [
    {
      "itemId": "65a1...",
      "dispatchedQty": 200
    }
  ]
}
```

---

### `POST /api/transfers/:id/receive`
Adds stock to destination.

**Request Body:**
```json
{
  "items": [
    {
      "itemId": "65a1...",
      "receivedQty": 195,
      "toZone": "B",
      "toBin": "B-1-03",
      "notes": "5 units damaged in transit"
    }
  ]
}
```

---

## Reports API

### `GET /api/reports/dashboard`
Returns all dashboard KPIs.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSKUs": 1204,
    "totalStockValue": 4523000,
    "lowStockCount": 23,
    "outOfStockCount": 5,
    "pendingPOs": 8,
    "criticalAlerts": 3,
    "stockTrend": [
      { "date": "2024-01-01", "value": 4100000 },
      { "date": "2024-01-02", "value": 4230000 }
    ],
    "topMovingItems": [
      { "item": "Bolt M6", "qty": 5400, "value": 13500 }
    ]
  }
}
```

---

### `GET /api/reports/export/:reportType`
**Path params:** `reportType` = stock-status | valuation | movements | aging | abc | expiry

**Query Parameters:** Same as the respective report filters, plus:
```
format    string    'excel' | 'pdf'   default: 'excel'
```

**Response:** Binary file download

---

## Alerts API

### `GET /api/alerts`
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a1...",
      "type": "low_stock",
      "severity": "warning",
      "title": "Low Stock: Bolt M6",
      "message": "Stock level (150) is below minimum (500) in Main Warehouse",
      "relatedEntity": {
        "type": "item",
        "id": "65a1...",
        "reference": "ITM-2400001"
      },
      "isRead": false,
      "isResolved": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### `GET /api/alerts/unread-count`
```json
{
  "success": true,
  "data": { "count": 7 }
}
```

---

## Pagination Standard

All list endpoints follow the same pagination pattern:

```typescript
// Request
GET /api/items?page=2&limit=25

// Response meta
{
  "meta": {
    "page": 2,
    "limit": 25,
    "total": 1204,
    "totalPages": 49,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## Rate Limits

| Endpoint Type | Limit |
|---|---|
| Authentication | 5 requests / 15 minutes / IP |
| General API | 100 requests / minute / user |
| Export endpoints | 10 requests / minute / user |
| Import endpoints | 5 requests / minute / user |
| Search endpoints | 30 requests / minute / user |

Rate limit headers returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```
