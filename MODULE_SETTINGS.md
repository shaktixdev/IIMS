# MODULE_SETTINGS.md — Settings & Configuration Module
## Industrial Inventory Management System (IIMS)

---

## Overview

Central configuration for the platform: organization info, auto-numbering, units, categories, tax rates, user management, and system preferences.

---

## Settings Sections

| Section | Description | Permission |
|---|---|---|
| Organization | Company name, logo, address, GSTIN | MANAGE_SETTINGS |
| Users & Roles | Add/edit users, assign roles | MANAGE_SETTINGS |
| Warehouses | Add/edit warehouses | MANAGE_SETTINGS |
| Categories | Item category tree | MANAGE_SETTINGS |
| Units | Units of measurement | MANAGE_SETTINGS |
| Numbering | Auto-number formats for PO, GRN, etc. | MANAGE_SETTINGS |
| Tax / GST | HSN codes, tax rates | MANAGE_SETTINGS |
| Notifications | Alert preferences | All authenticated |
| Integrations | Webhooks, API keys | MANAGE_SETTINGS (super_admin) |
| My Profile | Personal info, password | All authenticated |

---

## File Structure

```
src/
├── app/(dashboard)/
│   └── settings/
│       ├── page.tsx              # Redirects to /settings/organization
│       ├── layout.tsx            # Settings sidebar layout
│       ├── organization/page.tsx
│       ├── users/page.tsx
│       ├── warehouses/page.tsx   # Redirect to /warehouses
│       ├── categories/page.tsx
│       ├── units/page.tsx
│       ├── numbering/page.tsx
│       ├── notifications/page.tsx
│       └── profile/page.tsx
└── components/
    └── settings/
        ├── SettingsSidebar.tsx
        ├── OrganizationForm.tsx
        ├── CategoryTree.tsx
        ├── CategoryForm.tsx
        ├── UnitForm.tsx
        ├── NumberingConfig.tsx
        └── ProfileForm.tsx
```

---

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/settings/organization` | Get org info |
| PATCH | `/api/settings/organization` | Update org info |
| GET | `/api/settings/numbering` | Get numbering formats |
| PATCH | `/api/settings/numbering` | Update formats |
| GET | `/api/categories` | Full category tree |
| POST | `/api/categories` | Create category |
| PATCH | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete (if no items) |
| GET | `/api/units` | List units |
| POST | `/api/units` | Create unit |
| PATCH | `/api/units/:id` | Update unit |

---

## Category Tree

Categories support unlimited depth via parent reference:

```
Root Categories:
  ├── Raw Materials
  │   ├── Metals
  │   │   ├── Ferrous
  │   │   └── Non-Ferrous
  │   └── Polymers
  ├── Fasteners
  │   ├── Bolts
  │   ├── Nuts
  │   └── Screws
  ├── Electrical
  │   ├── Cables & Wires
  │   └── Switches
  ├── Hydraulics
  └── Consumables
```

**Category Attributes:** Each category can define custom fields that appear on items in that category:
```json
{
  "name": "Metals",
  "attributes": [
    { "name": "Grade", "type": "select", "options": ["304", "316", "2205"] },
    { "name": "Thickness (mm)", "type": "number" },
    { "name": "Surface Finish", "type": "text" }
  ]
}
```

**CategoryTree Component:**
- Expandable tree view (indented list)
- Drag to reorder / reparent (future)
- Click to select → shows form in right panel
- Add child category button on each node
- Item count badge per category

---

## Units System

```
Weight:  kg, g, mg, ton, lb, oz
Length:  m, cm, mm, inch, ft, yard
Volume:  L, mL, m³, gallon
Area:    m², cm², ft², inch²
Count:   pcs, set, pair, box, pack, roll, sheet, bag, drum
Time:    hr, min, sec, day
```

**Conversion:** Stored as factor to a base unit
```
kg = 1 (base)
g  = 0.001
ton = 1000
lb  = 0.453592
```

---

## Auto-Numbering Configuration

```typescript
interface NumberingConfig {
  items: {
    prefix:     string;   // "ITM-"
    separator:  string;   // ""
    digits:     number;   // 5
    includeYear:boolean;  // true
    preview:    string;   // "ITM-2400001"
  };
  purchaseOrders: { prefix: "PO-", digits: 5, includeYear: true };
  grn:            { prefix: "GRN-", digits: 5, includeYear: true };
  issueVouchers:  { prefix: "IV-", digits: 5, includeYear: true };
  transfers:      { prefix: "TRF-", digits: 5, includeYear: true };
  vendors:        { prefix: "VND-", digits: 3, includeYear: false };
}
```

**Auto-increment implementation (MongoDB):**
```typescript
// Using a counters collection to atomically increment
async function getNextSequence(name: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

async function generateNumber(type: keyof NumberingConfig): Promise<string> {
  const config = await getNumberingConfig(type);
  const seq = await getNextSequence(type);
  const year = config.includeYear ? new Date().getFullYear().toString().slice(-2) : '';
  const padded = seq.toString().padStart(config.digits, '0');
  return `${config.prefix}${year}${padded}`;
}
```

---

## Profile Page (`/settings/profile`)

- Name, email, phone, department (editable)
- Avatar upload (Cloudinary)
- Change password form
- Theme toggle (dark/light)
- Notification preferences
- Timezone selector
- Language selector (v1: EN only)

---

## Integrations (Phase 2)

```
Webhook Config:
- URL, secret key, events to subscribe
- Test webhook button
- Delivery log

API Keys:
- Generate / revoke API keys
- Key name, permissions scope, expiry
- Usage stats

Events available for webhooks:
- stock.low, stock.out
- po.created, po.approved, po.received
- grn.confirmed
- transfer.dispatched, transfer.received
```

---

## Default Data (Seed)

On first setup, seed:
```typescript
// Default categories
['Raw Materials', 'Finished Goods', 'Packing Material', 'Consumables', 
 'Spare Parts', 'Tools & Equipment', 'Office Supplies']

// Default units
['kg', 'g', 'pcs', 'm', 'L', 'mL', 'set', 'box', 'roll']

// Default warehouses
[{ code: 'WH-01', name: 'Main Warehouse', type: 'main' }]

// Default admin user
[{ name: 'Administrator', email: 'admin@company.com', role: 'super_admin' }]

// Default settings
[
  { key: 'inventory.defaultValuationMethod', value: 'AVERAGE' },
  { key: 'inventory.lowStockCheckEnabled', value: true },
  { key: 'po.autoCreateOnLowStock', value: false },
  { key: 'grn.requireApproval', value: true },
]
```
