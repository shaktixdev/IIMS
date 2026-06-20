# MODULE_ALERTS.md — Alerts & Notifications Module
## Industrial Inventory Management System (IIMS)

---

## Overview

Real-time alert system for critical inventory events: low stock, stockouts, expiring batches, overdue POs, and transfer delays. Delivered via in-app notifications, email, and optional webhook.

---

## Alert Types & Triggers

| Alert Type | Trigger Condition | Severity | Auto-Resolve? |
|---|---|---|---|
| `low_stock` | Stock < item.minStockLevel | warning | Yes (on GRN) |
| `out_of_stock` | Stock = 0 | critical | Yes (on GRN) |
| `overstock` | Stock > item.maxStockLevel | info | Yes (on issue) |
| `expiry_warning` | Batch expires in ≤ expiryAlertDays | warning | Yes (on consume) |
| `batch_expired` | Batch expiry date < today | critical | Manual |
| `po_overdue` | PO delivery date passed, status = sent | warning | Yes (on GRN) |
| `po_approval_pending` | PO draft older than 3 days | info | Yes (on approve) |
| `grn_pending` | GRN draft not confirmed > 24h | info | Yes (on confirm) |
| `transfer_delayed` | Transfer not received by expectedDate | warning | Yes (on receive) |
| `transfer_discrepancy` | Received qty < dispatched qty | warning | Manual |
| `price_variance` | GRN unit cost deviates > 15% from last price | warning | Manual |
| `quality_rejection` | GRN rejection rate > 20% | warning | Manual |

---

## File Structure

```
src/
├── app/(dashboard)/
│   └── alerts/
│       └── page.tsx              # Alert center
├── components/
│   └── alerts/
│       ├── AlertCenter.tsx       # Full alerts page
│       ├── AlertBell.tsx         # Topbar notification icon
│       ├── AlertPanel.tsx        # Sidebar mini-panel
│       ├── AlertCard.tsx         # Individual alert card
│       └── AlertBadge.tsx        # Severity badge
└── lib/
    ├── db/models/
    │   └── Alert.model.ts
    └── services/
        ├── alert.service.ts
        └── notification.service.ts
```

---

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts` | List alerts (paginated, filtered) |
| GET | `/api/alerts/unread-count` | Count of unread alerts |
| PATCH | `/api/alerts/:id/read` | Mark as read |
| PATCH | `/api/alerts/:id/resolve` | Mark as resolved |
| POST | `/api/alerts/mark-all-read` | Mark all as read |
| GET | `/api/alerts/settings` | Get user alert preferences |
| PATCH | `/api/alerts/settings` | Update preferences |

### Query Params
```typescript
{
  type?:        string
  severity?:    'info' | 'warning' | 'critical'
  isRead?:      boolean
  isResolved?:  boolean
  warehouse?:   string
  page?:        number
  limit?:       number
}
```

---

## Alert Service

```typescript
// lib/services/alert.service.ts

export async function createAlert(params: CreateAlertParams): Promise<Alert> {
  // Deduplicate: don't create duplicate unresolved alert of same type for same entity
  const existing = await Alert.findOne({
    type: params.type,
    'relatedEntity.id': params.relatedEntity.id,
    isResolved: false,
  });
  if (existing) return existing;

  const alert = await Alert.create(params);
  
  // Notify via real-time
  await broadcastAlert(alert);
  
  // Email if severity = critical
  if (alert.severity === 'critical') {
    await sendAlertEmail(alert);
  }
  
  return alert;
}

export async function resolveAlert(
  type: AlertType,
  entityId: string
): Promise<void> {
  await Alert.updateMany(
    { type, 'relatedEntity.id': entityId, isResolved: false },
    { isResolved: true, resolvedAt: new Date() }
  );
}

// Called after GRN confirm, issue, etc.
export async function checkStockAlerts(
  itemId: string,
  warehouseId: string
): Promise<void> {
  const stock = await Stock.findOne({ item: itemId, warehouse: warehouseId });
  const item = await Item.findById(itemId);
  
  if (!stock || !item) return;

  if (stock.quantityOnHand === 0) {
    await createAlert({ type: 'out_of_stock', severity: 'critical', ... });
  } else if (item.minStockLevel && stock.quantityOnHand <= item.minStockLevel) {
    await createAlert({ type: 'low_stock', severity: 'warning', ... });
    await resolveAlert('out_of_stock', itemId);
  } else {
    await resolveAlert('low_stock', itemId);
    await resolveAlert('out_of_stock', itemId);
  }

  if (item.maxStockLevel && stock.quantityOnHand > item.maxStockLevel) {
    await createAlert({ type: 'overstock', severity: 'info', ... });
  } else {
    await resolveAlert('overstock', itemId);
  }
}
```

---

## Real-Time Broadcasting

```typescript
// Uses Socket.io
// Server emits when alert is created:
io.to('alerts').emit('alert:new', {
  id: alert._id,
  type: alert.type,
  severity: alert.severity,
  title: alert.title,
  message: alert.message,
  createdAt: alert.createdAt,
});

// Client joins 'alerts' room on connect
// AlertBell component listens for 'alert:new'
// Increments unread badge count
// Plays subtle notification sound for 'critical' severity
```

---

## Email Notifications

```typescript
// lib/services/notification.service.ts
// Using Nodemailer + Resend

export async function sendAlertEmail(alert: Alert): Promise<void> {
  // Find users with relevant permissions and notifications enabled
  const recipients = await User.find({
    role: { $in: getRolesForAlertType(alert.type) },
    'preferences.notifications.lowStock': true,
    isActive: true,
  });

  const html = renderAlertEmailTemplate(alert);
  
  await resend.emails.send({
    from: 'noreply@iims.cosxstudio.in',
    to: recipients.map(u => u.email),
    subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
    html,
  });
}
```

---

## Scheduled Alert Checks (BullMQ)

```typescript
// Background jobs running on schedule

// Every 1 hour: check PO overdue
await queue.add('check-po-overdue', {}, { repeat: { every: 60 * 60 * 1000 } });

// Every 6 hours: check batch expiry
await queue.add('check-batch-expiry', {}, { repeat: { every: 6 * 60 * 60 * 1000 } });

// Every 24 hours: check draft GRNs
await queue.add('check-pending-grn', {}, { repeat: { cron: '0 9 * * *' } });

// Workers:
worker.process('check-po-overdue', async () => {
  const overduePOs = await PurchaseOrder.find({
    status: 'sent',
    deliveryDate: { $lt: new Date() },
  });
  for (const po of overduePOs) {
    await createAlert({ type: 'po_overdue', relatedEntity: { type: 'po', id: po._id } });
  }
});
```

---

## Alert Center UI (`/alerts`)

```
┌─────────────────────────────────────────────────────┐
│  Alert Center              [Mark All Read] [Filter] │
├─────────────────────────────────────────────────────┤
│  Tabs: All (24) | Critical (3) | Warning (15) | Info│
├─────────────────────────────────────────────────────┤
│  ● CRITICAL  ITM-00234 — Out of Stock               │
│  Bolt M6 in Warehouse A has reached zero stock      │
│  2 hours ago  [View Item] [Resolve]                 │
├─────────────────────────────────────────────────────┤
│  ▲ WARNING   PO-2024-00123 — Overdue                │
│  Vendor XYZ has not delivered by 15 Jan 2024        │
│  5 hours ago  [View PO] [Resolve]                   │
├─────────────────────────────────────────────────────┤
│  ℹ INFO      WH-01 — Overstock Alert                │
│  Copper Wire 2mm exceeds max stock level            │
│  1 day ago   [View Item] [Resolve]                  │
└─────────────────────────────────────────────────────┘
```

**AlertBell (Topbar):**
- Bell icon with red badge showing unread count
- Click → dropdown with last 5 unread alerts
- "View all alerts" link at bottom

---

## User Alert Preferences

```typescript
// Stored in user.preferences.notifications
interface AlertPreferences {
  lowStock:     boolean;  // Get notified on low stock
  outOfStock:   boolean;  // Critical: always on
  expiry:       boolean;  // Batch expiry
  newPO:        boolean;  // New PO created
  poOverdue:    boolean;  // PO past delivery date
  transfers:    boolean;  // Transfer delays/discrepancies
  emailAlerts:  boolean;  // Receive email for critical
  emailSummary: 'none' | 'daily' | 'weekly';
}
```
