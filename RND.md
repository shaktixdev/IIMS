# RND.md — Research & Development
## Industrial Inventory Management System (IIMS)

---

## 1. Project Overview

**Project Name:** IIMS — Industrial Inventory Management System  
**Stack:** Next.js 14 (App Router) · MongoDB (Mongoose) · TypeScript · Tailwind CSS · ShadCN UI  
**Target:** Mid-to-large scale manufacturing, warehousing, and distribution enterprises  
**Version:** 1.0.0  
**Author:** CosX Studio

---

## 2. Problem Statement

Industrial companies managing physical inventory face:

- **Manual errors** from spreadsheet-based tracking across departments
- **Zero real-time visibility** into stock levels across multiple warehouses
- **Disconnected purchasing workflows** — procurement, GRN, and vendor records live in separate tools
- **No predictive restocking** — leads to both stockouts and overstock situations
- **Audit failures** — lack of a traceable movement log for regulatory compliance
- **Poor inter-department collaboration** — store managers, procurement heads, and finance teams all work in silos

---

## 3. Research Findings

### 3.1 Industry Standards Referenced
| Standard | Purpose |
|---|---|
| ISO 55000 | Asset management systems |
| GS1 / Barcode Standards | Item identification & scanning |
| FIFO / FEFO / LIFO | Stock rotation methodologies |
| ABC Analysis | Inventory prioritization |
| EOQ Model | Economic Order Quantity calculation |
| Kanban / Min-Max | Reorder point systems |

### 3.2 Competitor Analysis
| Tool | Strength | Weakness |
|---|---|---|
| Fishbowl | Deep QB integration | Expensive, dated UI |
| inFlow Inventory | Simple UX | Not scalable to enterprise |
| SAP Business One | Feature-rich | Extremely complex, costly |
| Zoho Inventory | Modern UI | Weak for manufacturing floor |
| Odoo | Open-source | Requires heavy customization |

**Opportunity:** A modern, Next.js-native IMS with real-time dashboards, clean UI, and modular architecture that can be self-hosted or cloud-deployed.

### 3.3 Key User Personas
| Persona | Role | Primary Need |
|---|---|---|
| Store Manager | Day-to-day stock ops | Fast stock-in / stock-out UI |
| Procurement Officer | Purchasing & vendors | PO creation, vendor comparison |
| Warehouse Supervisor | Warehouse operations | Bin/shelf management, transfers |
| Finance Manager | Cost control | Valuation reports, budget tracking |
| System Admin | Platform management | User roles, audit trails, settings |
| Plant Manager | Executive oversight | Dashboard KPIs, alerts |

---

## 4. Technical Research

### 4.1 Framework Decision — Next.js 14 App Router
- Server Components reduce client JS bundle
- Parallel Routes enable multi-panel dashboards
- Route Handlers replace Express API layer
- Server Actions for form-heavy operations (GRN, PO, transfers)
- Streaming for large report generation

### 4.2 Database — MongoDB
- Flexible schema for varied product attribute sets (industrial items differ vastly)
- Aggregation pipeline for complex inventory valuation queries
- Change Streams for real-time stock level updates
- Atlas Search for fast SKU/item lookup
- Time-series collections for stock history

### 4.3 Authentication
- **NextAuth.js v5** with credential + OAuth providers
- Role-Based Access Control (RBAC) with 6 predefined roles
- Session stored in JWT + MongoDB adapter
- Route-level middleware guards

### 4.4 Real-Time Strategy
- **Socket.io** or **Pusher** for live stock alerts
- MongoDB Change Streams → WebSocket broadcast
- Dashboard widgets poll via SWR with 30s revalidation fallback

### 4.5 Barcode / QR Integration
- **@zxing/browser** for webcam-based scanning
- USB/Bluetooth scanner support via HID keyboard input simulation
- QR code generation: **qrcode** npm package
- Barcode printing via PDF generation (react-pdf)

### 4.6 Reporting & Export
- **ExcelJS** for .xlsx export
- **@react-pdf/renderer** for PDF reports
- Chart.js / Recharts for inline dashboard charts
- Server-side aggregation for large dataset exports

### 4.7 File Storage
- **Cloudinary** or **AWS S3** for product images, documents
- Presigned URLs for secure upload from client

---

## 5. Feature Prioritization (MoSCoW)

### Must Have (v1.0)
- [ ] Multi-warehouse inventory tracking
- [ ] Item master with categories, units, attributes
- [ ] Stock-In (GRN) and Stock-Out (Issue) flows
- [ ] Purchase Order management
- [ ] Vendor management
- [ ] Reorder alerts
- [ ] Role-based access control
- [ ] Audit trail / movement log
- [ ] Dashboard KPIs
- [ ] Barcode scanning

### Should Have (v1.1)
- [ ] Inter-warehouse transfer
- [ ] Batch / Lot tracking
- [ ] Serial number tracking
- [ ] Customer dispatch / delivery challan
- [ ] Automated PO on reorder trigger
- [ ] Supplier performance scoring

### Could Have (v1.2)
- [ ] Bill of Materials (BOM) for manufacturing
- [ ] Work order integration
- [ ] Multi-currency support
- [ ] Mobile PWA / React Native app
- [ ] AI-powered demand forecasting

### Won't Have (v1.0)
- ERP full suite (accounting, HR)
- POS terminal
- Direct bank integration

---

## 6. Data Flow Architecture

```
User Action (Browser)
        ↓
Next.js Server Component / Server Action / Route Handler
        ↓
Service Layer (business logic)
        ↓
Repository Layer (Mongoose models)
        ↓
MongoDB Atlas
        ↓
Change Streams → WebSocket → Dashboard UI
```

---

## 7. Scalability Considerations

- MongoDB sharding for warehouse-level data partitioning
- Redis caching layer for stock level reads (high-frequency)
- Background jobs via **BullMQ** for report generation, email alerts
- CDN for static assets (Vercel Edge / Cloudflare)
- Horizontal scaling via stateless Next.js on Docker / Kubernetes

---

## 8. Security Research

| Threat | Mitigation |
|---|---|
| Unauthorized stock manipulation | RBAC + audit trail on all writes |
| SQL/NoSQL injection | Mongoose schema validation + Zod |
| Session hijacking | httpOnly JWT cookies, CSRF tokens |
| Data exfiltration | Rate limiting on export endpoints |
| Insider misuse | Immutable audit logs, anomaly detection |

---

## 9. Development Phases

| Phase | Duration | Deliverable |
|---|---|---|
| Phase 1 | Week 1–2 | Project scaffold, auth, DB schema, item master |
| Phase 2 | Week 3–4 | Stock-in/out, GRN, warehouse setup |
| Phase 3 | Week 5–6 | Purchase orders, vendor management |
| Phase 4 | Week 7–8 | Reports, alerts, dashboard |
| Phase 5 | Week 9–10 | Transfers, batch tracking, testing |
| Phase 6 | Week 11–12 | QA, performance tuning, deployment |

---

## 10. Tech Stack Summary

```
Frontend:         Next.js 14 (App Router) + TypeScript
UI Library:       Tailwind CSS + ShadCN UI
State:            Zustand + SWR
Auth:             NextAuth.js v5
Database:         MongoDB + Mongoose
Cache:            Redis (ioredis)
Queue:            BullMQ
File Storage:     Cloudinary / S3
Real-time:        Socket.io / Pusher
Barcode:          @zxing/browser
Export:           ExcelJS + @react-pdf/renderer
Email:            Nodemailer + Resend
Testing:          Vitest + Playwright
Deployment:       Vercel / Docker + MongoDB Atlas
```
