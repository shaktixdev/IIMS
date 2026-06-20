# README.md — Industrial IMS Documentation Index
## CosX Studio · cosxstudio.in

---

```
██╗██╗███╗   ███╗███████╗
██║██║████╗ ████║██╔════╝
██║██║██╔████╔██║███████╗
██║██║██║╚██╔╝██║╚════██║
██║██║██║ ╚═╝ ██║███████║
╚═╝╚═╝╚═╝     ╚═╝╚══════╝
Industrial Inventory Management System
```

---

## What Is This

IIMS is a full-stack industrial inventory management platform built on **Next.js 14 + MongoDB + TypeScript**.

It covers the complete inventory lifecycle: item master, multi-warehouse stock tracking, purchase orders, goods receipts, stock issuance, inter-warehouse transfers, vendor management, and comprehensive reporting — with role-based access, real-time alerts, and barcode scanning.

---

## Documentation Map

| File | Contents |
|---|---|
| **README.md** | This file — index and overview |
| **RND.md** | Research, problem statement, competitor analysis, tech decisions, feature prioritization |
| **DESIGN.md** | Full UI/UX design system — colors, typography, components, layouts, accessibility |
| **SCHEMA.md** | Complete MongoDB schema for all collections with indexes |
| **SETUP.md** | Installation, folder structure, environment variables, deployment |
| **API_REFERENCE.md** | Complete REST API reference with request/response examples |
| **MODULE_AUTH.md** | Authentication, sessions, RBAC, permissions matrix |
| **MODULE_INVENTORY.md** | Item master, stock levels, GRN, issue vouchers, adjustments, barcode |
| **MODULE_PURCHASE.md** | Vendors, purchase orders, PO lifecycle, auto-PO, vendor performance |
| **MODULE_WAREHOUSE.md** | Warehouse setup, zones/bins, inter-warehouse transfers, stock counts |
| **MODULE_REPORTS.md** | All 15 reports, dashboard KPIs, charts, Excel/PDF export |
| **MODULE_ALERTS.md** | Alert types, real-time notifications, email alerts, scheduled checks |
| **MODULE_SETTINGS.md** | Org setup, categories, units, auto-numbering, user preferences |
| **MODULE_STOREKEEPER.md** | Storekeeper dashboard, issue vouchers, item returns, department master |

---

## System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    NEXT.JS 14 APP ROUTER                   │
├──────────────────────┬─────────────────────────────────────┤
│   Frontend (RSC)     │     Backend (Route Handlers)        │
│   ShadCN + Tailwind  │     Mongoose + Service Layer        │
│   Recharts           │     Zod Validation                  │
│   SWR + Zustand      │     NextAuth Sessions               │
├──────────────────────┴─────────────────────────────────────┤
│                      MONGODB ATLAS                          │
│   12 core collections · Aggregation Pipelines              │
│   Change Streams → Real-time alerts                        │
├─────────────────────────────────────────────────────────────┤
│   Redis (BullMQ)    │  Socket.io   │  Cloudinary / S3      │
│   Job Queues        │  Real-time   │  File Storage          │
│   Scheduled reports │  Stock push  │  Product images        │
└─────────────────────────────────────────────────────────────┘
```

---

## Module Overview

```
┌─── AUTH ───────────────────────────────────────────────────┐
│  6 roles · JWT sessions · Route guards · RBAC              │
├─── INVENTORY ──────────────────────────────────────────────┤
│  Item Master → GRN (Stock In) → Issue Voucher (Stock Out)  │
│  Batch/Serial tracking · Barcode scanning · Adjustments    │
├─── PURCHASE ───────────────────────────────────────────────┤
│  Vendor Master → Purchase Orders → GRN link                │
│  PO lifecycle · Auto-PO on reorder · Vendor performance    │
├─── WAREHOUSE ──────────────────────────────────────────────┤
│  Multi-warehouse · Zone/Bin system · Inter-warehouse        │
│  Transfers · Physical stock count                          │
├─── REPORTS ────────────────────────────────────────────────┤
│  15 report types · Real-time dashboard · Excel/PDF export  │
│  ABC analysis · Aging · Valuation · Expiry tracking        │
├─── ALERTS ─────────────────────────────────────────────────┤
│  12 alert types · In-app + Email · Real-time push          │
│  Scheduled checks via BullMQ                               │
├─── STOREKEEPER ────────────────────────────────────────────┤
│  Department master · Issue Vouchers (slip-based)           │
│  Item Returns · Condition tracking · Print voucher         │
└─── SETTINGS ───────────────────────────────────────────────┘
   Org setup · Categories · Units · Numbering · User mgmt
```

---

## Key Data Flows

### Stock-In (GRN)
```
Create PO → Vendor delivers → Create GRN draft → 
Confirm GRN → Stock updated → PO status updated → 
Low stock alerts resolved → Real-time push to dashboard
```

### Stock-Out (Issue)
```
Create Issue Voucher → Approve → Stock deducted → 
Movement logged → Check reorder trigger → 
Create low stock alert if needed
```

### Inter-Warehouse Transfer
```
Create Transfer → Dispatch (source deducted, in-transit) → 
Receive at destination (in-transit cleared, dest added) → 
Discrepancy logged if any
```

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd iims
npm install

# 2. Configure
cp .env.example .env.local
# Edit .env.local with MongoDB URI and other values

# 3. Seed database
npm run seed

# 4. Start dev server
npm run dev

# Access: http://localhost:3000
# Default admin: admin@company.com / admin123
```

---

## Build Order for Cursor / Claude Code

Recommended order for building modules:

```
1. Project setup + DB connection + auth (MODULE_AUTH)
2. Settings — categories, units, warehouses (MODULE_SETTINGS)  
3. Item Master (MODULE_INVENTORY — items only)
4. Stock levels + opening stock (MODULE_INVENTORY — stock)
5. Vendors + Purchase Orders (MODULE_PURCHASE)
6. GRN flow (MODULE_INVENTORY — GRN)
7. Issue Vouchers (MODULE_INVENTORY — issues)
8. Transfers (MODULE_WAREHOUSE)
9. Alerts system (MODULE_ALERTS)
10. Reports + Dashboard (MODULE_REPORTS)
11. Storekeeper — departments, issue vouchers, returns
12. Barcode scanning + batch tracking
12. Export (Excel/PDF)
13. Real-time (Socket.io)
14. Background jobs (BullMQ)
15. Polish, testing, deployment
```

---

## Built By

**CosX Studio** — Web Design & Development  
📍 Bokaro, Jharkhand, India  
🌐 [cosxstudio.in](https://cosxstudio.in)

---

*All documentation is implementation-ready. Each module file contains exact schemas, API routes, service functions, validations, and UI specifications sufficient to build directly from.*
