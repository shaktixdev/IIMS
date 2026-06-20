# IIMS Testing & Verification Plan (test.md)
## Industrial Inventory Management System (IIMS)

This document outlines the testing strategy, test suites, and verification scripts for the Industrial Inventory Management System. It covers automated unit testing with **Vitest**, End-to-End (E2E) testing with **Playwright**, and step-by-step Manual Verification scenarios.

---

## 1. Testing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       PLAYWRIGHT (E2E)                          │
│   Simulates user actions: login, creates PO, submits GRN        │
└────────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       VITEST (Unit/Int)                         │
│   Tests API endpoints, DB queries, permission helpers, services │
└─────────────────────────────────────────────────────────────────┘
```

- **Unit Testing (Vitest):** Mocks database transactions and checks pure functions (e.g., Average Cost calculations, auto-number generation, RBAC checks).
- **Integration Testing (Vitest + MongoDB Memory Server):** Spins up a temporary database to verify write operations, cascading stock changes, and database triggers.
- **E2E Testing (Playwright):** Launches browser instances to run full integration flows such as PO lifecycle and inter-warehouse stock transfer.

---

## 2. Unit & Integration Test Cases (Vitest)

### 2.1 Role-Based Access Control (`lib/auth/permissions.test.ts`)
- [ ] **TC-001:** Super Admin can access all operations (Manage Users, Settings, Adjustments).
- [ ] **TC-002:** Store Keeper can create GRNs and issue stock, but cannot delete items or view financial reports.
- [ ] **TC-003:** Viewer role gets 403 Forbidden for all write mutation endpoints (`POST`, `PATCH`, `DELETE`).

### 2.2 Auto-Numbering Engine (`lib/utils/numbering.test.ts`)
- [ ] **TC-004:** Sequence generator handles concurrency (atomically increments using MongoDB `$inc`).
- [ ] **TC-005:** Generated strings follow patterns: `PO-YY00001` (e.g., `PO-2600001`).

### 2.3 Valuation & Costing Calculations (`lib/services/stock.test.ts`)
- [ ] **TC-006:** **Average Costing Update:** 
  - Starting stock: 10 units @ $10/unit.
  - Receipt (GRN): 10 units @ $20/unit.
  - Assert new Average Cost: `((10 * 10) + (10 * 20)) / 20 = $15`.
- [ ] **TC-007:** **FIFO Inventory Deduction:** Correctly deducts from the oldest active batch first when issuing stock.
- [ ] **TC-008:** **FEFO Expiry Deduction:** Deducts earliest expiring batch first.

---

## 3. End-to-End User Journeys (Playwright)

### 3.1 E2E-1: The Procurement-to-Receipt Flow
1. **Login:** Log in as `procurement@company.com`.
2. **Vendor Check:** Confirm vendor `VND-001` exists.
3. **PO Creation:** Add 500 units of `ITM-001` (cost $5.00) to a new Purchase Order for the Main Warehouse. Save & Send.
4. **Login Change:** Log in as `store_keeper@company.com`.
5. **GRN Verification:** Open the draft GRN linked to the PO. Verify the expected quantity is 500.
6. **Stock Intake:** Input received: 500, accepted: 480, rejected: 20 (reason: bent threads). Confirm GRN.
7. **Assertions:**
   - PO status is updated to `partial` (due to rejected qty).
   - Main Warehouse stock for `ITM-001` has increased by 480 units.
   - A `low_stock` alert is resolved if the new total is above the minimum threshold.

### 3.2 E2E-2: Inter-Warehouse Transfer Flow
1. **Login:** Log in as `manager@company.com`.
2. **Transfer Creation:** Create transfer of 100 units of `ITM-001` from Main Warehouse to sub-warehouse `WH-02`.
3. **Dispatch:** Enter transporter info and click Dispatch.
   - Assert: Source warehouse quantity has decreased by 100.
   - Assert: Source warehouse quantity-in-transit has increased by 100.
4. **Receive:** Mark the transfer as received at `WH-02`.
   - Assert: Transit count goes back to 0.
   - Assert: Destination warehouse stock has increased by 100.

---

## 4. Manual Verification Runbook

### 4.1 Real-Time WebSocket Alerts
1. Open two browser windows (Window A: Logged in as Admin on Dashboard; Window B: Logged in as Store Keeper on Issue Voucher page).
2. In Window B, submit a stock issue voucher that reduces an item below its minimum stock level.
3. Verify that Window A instantly displays a Toast notification for `low_stock` without page refresh.

### 4.2 Document Export Tests
1. Navigate to `/reports/valuation`.
2. Apply filter for category: "Raw Materials".
3. Click "Export Excel" and verify a `.xlsx` file downloads with formatted headers, auto-fit columns, and proper calculation formulas.
4. Click "Download PDF" on a Purchase Order detail page, verifying the invoice layout, logo positioning, and totals-in-words converter logic.
