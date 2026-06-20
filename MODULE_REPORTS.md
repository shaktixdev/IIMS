# MODULE_REPORTS.md — Reports & Analytics Module
## Industrial Inventory Management System (IIMS)

---

## Overview

Comprehensive reporting and analytics: stock valuation, movement analysis, vendor analytics, purchase analytics, and exportable operational reports.

---

## Report Categories

| # | Report Name | Type | Export |
|---|---|---|---|
| 1 | Dashboard KPIs | Live | — |
| 2 | Stock Status Report | Tabular | Excel, PDF |
| 3 | Stock Valuation Report | Tabular | Excel, PDF |
| 4 | Stock Movement Report | Tabular | Excel |
| 5 | Inventory Aging Report | Tabular | Excel, PDF |
| 6 | ABC Analysis Report | Tabular + Chart | Excel |
| 7 | Reorder Level Report | Tabular | Excel |
| 8 | GRN Summary Report | Tabular | Excel, PDF |
| 9 | Purchase Order Report | Tabular | Excel |
| 10 | Vendor Performance Report | Chart + Table | Excel, PDF |
| 11 | Item-wise Movement Report | Tabular | Excel |
| 12 | Warehouse Utilization Report | Chart | Excel |
| 13 | Low Stock Alert Report | Tabular | Excel |
| 14 | Expiry Report | Tabular | Excel |
| 15 | Transfer Report | Tabular | Excel |

---

## File Structure

```
src/
├── app/(dashboard)/
│   └── reports/
│       ├── page.tsx              # Report selector
│       ├── stock-status/page.tsx
│       ├── valuation/page.tsx
│       ├── movements/page.tsx
│       ├── aging/page.tsx
│       ├── abc-analysis/page.tsx
│       ├── purchase/page.tsx
│       ├── vendor-performance/page.tsx
│       └── expiry/page.tsx
├── components/
│   └── reports/
│       ├── ReportSidebar.tsx
│       ├── ReportFilters.tsx
│       ├── ReportTable.tsx
│       ├── ReportChart.tsx
│       ├── ExportButton.tsx
│       └── charts/
│           ├── StockTrendChart.tsx
│           ├── ABCDonutChart.tsx
│           ├── MovementBarChart.tsx
│           └── VendorScoreChart.tsx
└── lib/
    └── services/
        ├── reports.service.ts
        └── export.service.ts
```

---

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/stock-status` | Current stock across warehouses |
| GET | `/api/reports/valuation` | Inventory valuation |
| GET | `/api/reports/movements` | Stock movements with filters |
| GET | `/api/reports/aging` | Items without movement by days |
| GET | `/api/reports/abc` | ABC analysis by value |
| GET | `/api/reports/reorder` | Items at/below reorder point |
| GET | `/api/reports/grn-summary` | GRN history |
| GET | `/api/reports/purchase` | PO summary |
| GET | `/api/reports/vendor-performance` | Vendor metrics |
| GET | `/api/reports/expiry` | Batch expiry status |
| GET | `/api/reports/transfers` | Transfer history |
| GET | `/api/reports/dashboard` | All KPIs for dashboard |
| GET | `/api/reports/export/:type` | Export any report |

---

## Report Specifications

### 1. Stock Status Report
**Purpose:** Point-in-time snapshot of all stock levels  
**Filters:** Warehouse, Category, Status, Date  
**Columns:** SKU, Item Name, Category, Unit, Warehouse, Zone, Qty On Hand, Qty Reserved, Qty Available, Min Level, Status  
**Grouping options:** By Category, By Warehouse, By Status

### 2. Stock Valuation Report
**Purpose:** Financial value of current inventory  
**Filters:** Warehouse, Category, Valuation Method, Date  
**Columns:** SKU, Item Name, Qty, Avg Cost, Total Value, Last Updated  
**Totals:** Grand total value by warehouse and overall  
**MongoDB Aggregation:**
```javascript
[
  { $match: { warehouse: warehouseId } },
  {
    $lookup: {
      from: 'items',
      localField: 'item',
      foreignField: '_id',
      as: 'itemData'
    }
  },
  {
    $group: {
      _id: '$warehouse',
      totalValue: { $sum: '$totalValue' },
      totalItems: { $sum: 1 },
      totalQty: { $sum: '$quantityOnHand' }
    }
  }
]
```

### 3. Stock Movement Report
**Purpose:** Audit trail of all stock in/out  
**Filters:** Date range, Warehouse, Item, Movement Type, User  
**Columns:** Date, Movement#, Type, Item, SKU, Qty, Unit Cost, Total Value, Reference, User  
**Movement types filter:** GRN, Issue, Transfer, Adjustment, Return

### 4. Inventory Aging Report
**Purpose:** Identify slow/dead inventory  
**Logic:** Time since last movement  
**Buckets:** 0–30 days, 31–60 days, 61–90 days, 90+ days  
**Columns:** Item, SKU, Category, Qty, Last Movement Date, Days Since Movement, Value, Aging Bucket  
**MongoDB Aggregation:**
```javascript
[
  {
    $addFields: {
      daysSinceMovement: {
        $divide: [
          { $subtract: [new Date(), '$lastMovement'] },
          1000 * 60 * 60 * 24
        ]
      }
    }
  },
  {
    $addFields: {
      agingBucket: {
        $switch: {
          branches: [
            { case: { $lte: ['$daysSinceMovement', 30] }, then: '0-30' },
            { case: { $lte: ['$daysSinceMovement', 60] }, then: '31-60' },
            { case: { $lte: ['$daysSinceMovement', 90] }, then: '61-90' },
          ],
          default: '90+'
        }
      }
    }
  }
]
```

### 5. ABC Analysis Report
**Purpose:** Prioritize inventory by value contribution  
**Method:**
- Sort items by annual consumption value (qty × avg cost)
- A items: top 70% of value (~10–20% of items)
- B items: next 20% of value (~30% of items)  
- C items: bottom 10% of value (~50% of items)
**Chart:** Donut chart with A/B/C distribution  
**Use:** Determines reorder priority and safety stock levels

### 6. Expiry Report
**Purpose:** Proactive batch expiry management  
**Filters:** Warehouse, Days to Expiry (7/15/30/60/all), Item Category  
**Columns:** Batch#, Item, SKU, Qty, Manufacturing Date, Expiry Date, Days to Expiry, Warehouse, Status  
**Color coding:** < 7 days = red, 7–30 = amber, > 30 = green

### 7. Vendor Performance Report
**Metrics per vendor:**
- Total POs placed (count + value)
- Average lead time (days)
- On-time delivery rate (%)
- Quality acceptance rate (%)
- Return/rejection rate (%)
- Composite score (0–100)
**Chart:** Radar/spider chart per vendor, bar chart for comparison

---

## Dashboard KPIs

```typescript
interface DashboardKPIs {
  // Stock
  totalSKUs:            number;
  totalStockValue:      number;
  lowStockCount:        number;
  outOfStockCount:      number;
  
  // Movements (last 30 days)
  totalGRNs:            number;
  totalIssues:          number;
  totalTransfers:       number;
  
  // Purchase
  pendingPOs:           number;
  pendingPOsValue:      number;
  overdueGRNs:          number;
  
  // Alerts
  criticalAlerts:       number;
  warningAlerts:        number;
  
  // Trends (for charts)
  stockTrend:           { date: string; value: number }[];  // 30 days
  movementsByType:      { type: string; count: number }[];
  topMovingItems:       { item: string; qty: number }[];
}
```

---

## Charts Used (Recharts)

| Chart | Used In |
|---|---|
| AreaChart | Stock value trend (Dashboard) |
| BarChart | Daily movements, PO spend by month |
| LineChart | Item stock over time (Item Detail) |
| PieChart | Stock by category, ABC distribution |
| RadarChart | Vendor performance comparison |
| ComposedChart | GRN vs PO quantity comparison |

---

## Export Service

### Excel Export (ExcelJS)
```typescript
// reports/export/excel.ts
export async function exportToExcel(
  reportType: string,
  data: any[],
  columns: ColumnDef[],
  filters: any
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(reportType);
  
  // Header row styling
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1C2030' }
  };
  
  // Add columns
  sheet.columns = columns.map(col => ({
    header: col.label,
    key: col.key,
    width: col.width || 15,
  }));
  
  // Add data rows
  data.forEach(row => sheet.addRow(row));
  
  // Auto-filter
  sheet.autoFilter = {
    from: 'A1',
    to: String.fromCharCode(64 + columns.length) + '1'
  };
  
  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}
```

### PDF Export (@react-pdf/renderer)
```typescript
// For tabular reports: table with company header
// For GRN/PO: formatted document layout
// Generated server-side, streamed as response

GET /api/reports/export/pdf?type=stock-status&warehouse=...
→ Content-Type: application/pdf
→ Content-Disposition: attachment; filename="stock-status-2024-01-01.pdf"
```

---

## Scheduled Reports (Phase 2)

Via BullMQ cron jobs:
- Daily: Low stock summary → email to managers
- Weekly: Stock valuation → email to finance
- Monthly: Vendor performance → email to procurement
- Custom: User-defined report schedule via Settings UI

---

## Report Page UI

```
┌─────────────────────────────────────────────────────┐
│  Reports                                             │
├──────────────┬──────────────────────────────────────┤
│  Report List │  Filters Bar                         │
│              ├──────────────────────────────────────┤
│  • Stock     │  [Preview / Table Area]              │
│  • Movements │                                      │
│  • Purchase  │  Data loads server-side              │
│  • Vendor    │  Streaming for large datasets        │
│  • Expiry    │                                      │
│  • Aging     │                                      │
│  • ABC       │                                      │
│              ├──────────────────────────────────────┤
│              │  [Export Excel]  [Export PDF]        │
└──────────────┴──────────────────────────────────────┘
```

**Performance:**
- Reports with > 500 rows: server-side pagination
- Reports with > 5,000 rows: background job + download link
- All reports cached in Redis for 5 minutes
- Cache invalidated on relevant stock/PO updates
