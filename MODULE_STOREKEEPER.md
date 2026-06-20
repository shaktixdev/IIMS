# MODULE_STOREKEEPER.md — Storekeeper & Issue Management Module
## Industrial Inventory Management System (IIMS)

---

## Overview

Dedicated module for the storekeeper role. Manages the full issue lifecycle:
physical-slip-based item issuance to helpers/workers, and item returns.

No digital approval workflow — approval is offline (physical signed slip).
The system records the approval for audit purposes only.

**Only actor in the system: the Storekeeper (and above roles for oversight).**

---

## Real-World Flow (Mapped to System)

```
Helper needs item
      ↓
Goes to Department Head
      ↓
Dept Head writes physical slip
(helper name, dept, item, signs it)
      ↓
Helper carries slip to Storekeeper
      ↓
Storekeeper opens system → New Issue
Types slip details → selects item → confirms
      ↓
System auto-fills: date/time, storekeeper name (session)
Stock deducted from warehouse
Issue Voucher created (printable)
      ↓
Helper returns unused items? → Return Flow
```

---

## Sub-Modules

1. Department Master (dropdown source)
2. Issue Voucher (storekeeper creates)
3. Item Return (against original voucher)
4. Storekeeper Dashboard

---

## File Structure

```
src/
├── app/(dashboard)/
│   └── storekeeper/
│       ├── page.tsx                  # Storekeeper dashboard
│       ├── issue/
│       │   ├── page.tsx              # Issue voucher list
│       │   ├── new/page.tsx          # Create issue (main flow)
│       │   └── [id]/page.tsx         # Issue detail + print
│       └── returns/
│           ├── page.tsx              # Returns list
│           └── [id]/page.tsx         # Return detail
├── components/
│   └── storekeeper/
│       ├── StorekeeperDashboard.tsx
│       ├── IssueVoucherForm.tsx      # Main form storekeeper fills
│       ├── IssueVoucherDetail.tsx    # View + print
│       ├── IssueVoucherTable.tsx
│       ├── ReturnForm.tsx
│       ├── ReturnTable.tsx
│       ├── RequesterFields.tsx       # Reusable requester block
│       └── PrintableVoucher.tsx      # Print layout
└── lib/
    ├── db/models/
    │   ├── IssueVoucher.model.ts     # Updated schema
    │   ├── ItemReturn.model.ts       # New
    │   └── Department.model.ts       # New
    └── services/
        ├── issue.service.ts
        └── return.service.ts
```

---

## 1. Department Master

### Schema — `departments` Collection

```typescript
{
  _id:          ObjectId,
  name:         String (required, unique),
  // e.g. "Electrical", "Mechanical", "Civil", "Production", "Maintenance"
  code:         String (unique),  // e.g. "ELEC", "MECH"
  head:         String,           // Name of department head (free text, not a user)
  isActive:     Boolean (default: true),
  createdBy:    ObjectId → users,
  createdAt:    Date,
  updatedAt:    Date,
}
```

### API Routes

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/departments` | List all active departments | All authenticated |
| POST | `/api/departments` | Create department | MANAGE_SETTINGS |
| PATCH | `/api/departments/:id` | Update | MANAGE_SETTINGS |
| DELETE | `/api/departments/:id` | Soft delete | MANAGE_SETTINGS |

### Default Departments (Seed)
```
Electrical, Mechanical, Civil, Production,
Maintenance, Safety, Instrumentation, IT, Admin, Other
```

---

## 2. Issue Voucher

### Schema — `issueVouchers` Collection

```typescript
{
  _id:              ObjectId,

  // Auto-generated
  voucherNumber:    String (unique, e.g. "IV-2024-00001"),
  issuedAt:         Date (default: Date.now),
  issuedBy:         ObjectId → users,   // storekeeper, from session — auto
  warehouse:        ObjectId → warehouses,

  // From the physical slip — storekeeper types these
  requester: {
    name:           String (required),        // Helper/worker name
    employeeId:     String (optional),        // badge/ID if available
    department:     ObjectId → departments,   // dropdown
    departmentOther:String,                   // filled if "Other" selected
    departmentName: String,                   // virtual: resolved name
  },

  approver: {
    name:           String (required),        // Dept head who signed slip
    designation:    String (required),        // "Electrical Supervisor"
    slipReference:  String (optional),        // Slip number if dept maintains one
  },

  // Items
  items: [{
    _id:            ObjectId,
    item:           ObjectId → items,
    quantity:       Number (required),
    issuedQty:      Number,               // same as quantity on issue
    returnedQty:    Number (default: 0),  // updated as returns come in
    pendingQty:     Number,               // issuedQty - returnedQty (virtual)
    unit:           ObjectId → units,
    batch:          ObjectId → batches (optional),
    serialNumbers:  [ObjectId → serialNumbers] (optional),
    remarks:        String,
  }],

  remarks:          String,
  status:           Enum ['issued', 'partial_return', 'fully_returned'],

  // Return tracking
  returns:          [ObjectId → itemReturns],

  createdAt:        Date,
  updatedAt:        Date,
}
```

---

### Issue Voucher Form UI — `/storekeeper/issue/new`

```
┌─────────────────────────────────────────────────────────┐
│  New Issue Voucher              IV-2024-00089 (auto)    │
│  Date: 19 Jun 2024  10:42 AM   Issued by: Ramesh K.    │
│  (all auto from session + server time)                  │
├─────────────────────────────────────────────────────────┤
│  REQUESTER DETAILS  (from physical slip)                │
│                                                         │
│  Helper / Worker Name *    [ Suresh Kumar         ]     │
│  Employee ID               [ EMP-0234  ] (optional)    │
│  Department *              [ Electrical        ▼  ]     │
│                            (if Other → text appears)    │
├─────────────────────────────────────────────────────────┤
│  APPROVER DETAILS  (person who signed the slip)         │
│                                                         │
│  Approver Name *           [ Mr. Sharma           ]     │
│  Designation *             [ Electrical Supervisor]     │
│  Slip Reference            [ EL-2024-012 ] (optional)  │
├─────────────────────────────────────────────────────────┤
│  WAREHOUSE                                              │
│  Issuing From *            [ Main Store         ▼  ]    │
├─────────────────────────────────────────────────────────┤
│  ITEMS                                                  │
│                                                         │
│  [ Search item by name or SKU...  🔍  📷 ]              │
│                                                         │
│  Item              │ Qty  │ Unit │ Available │ Remove   │
│  ─────────────────────────────────────────────────────  │
│  Wire Cutter 6"    │  1   │ pcs  │    12     │   ✕     │
│  Electrical Tape   │  3   │ roll │    45     │   ✕     │
│  [+ Add Item]                                           │
├─────────────────────────────────────────────────────────┤
│  Remarks           [ ________________________________ ] │
├─────────────────────────────────────────────────────────┤
│             [Save Draft]    [Issue & Print]              │
└─────────────────────────────────────────────────────────┘
```

**Key UX behaviours:**
- Department dropdown: all active departments + "Other" at bottom
- If "Other" selected → text input appears below for custom dept name
- Item search: live search by name/SKU, shows available qty beside each result
- Qty input: validates against available stock in real time, turns red if exceeded
- "Issue & Print": issues stock + opens printable voucher in new tab
- "Save Draft": saves without deducting stock (for review before confirming)

---

### Issue Flow (Service)

```typescript
// lib/services/issue.service.ts

export async function issueVoucher(
  data: CreateIssueVoucherDto,
  userId: string
): Promise<IssueVoucher> {

  // 1. Validate all items have enough stock
  for (const line of data.items) {
    const available = await checkAvailability(line.item, data.warehouse, line.quantity);
    if (!available) throw new InsufficientStockError(line.item);
  }

  // 2. Generate voucher number
  const voucherNumber = await generateNumber('issueVouchers');

  // 3. Resolve department name
  const deptName = await resolveDepartmentName(
    data.requester.department,
    data.requester.departmentOther
  );

  // 4. Create voucher
  const voucher = await IssueVoucher.create({
    ...data,
    voucherNumber,
    issuedBy: userId,
    issuedAt: new Date(),
    status: 'issued',
    'requester.departmentName': deptName,
    items: data.items.map(i => ({ ...i, issuedQty: i.quantity, returnedQty: 0 })),
  });

  // 5. Deduct stock + create movement for each item
  for (const line of data.items) {
    await updateStock({
      item:      line.item,
      warehouse: data.warehouse,
      delta:     -line.quantity,
      type:      'issue',
      reference: { type: 'issue_voucher', id: voucher._id, number: voucherNumber },
      userId,
    });
  }

  // 6. Check if any item is now low/out → trigger alerts
  for (const line of data.items) {
    await checkStockAlerts(line.item, data.warehouse);
  }

  return voucher;
}
```

---

### API Routes — Issue Vouchers

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/issues` | List all issue vouchers | store_keeper+ |
| POST | `/api/issues` | Create + issue | store_keeper+ |
| GET | `/api/issues/:id` | Voucher detail | store_keeper+ |
| POST | `/api/issues/:id/confirm` | Confirm draft → deduct stock | store_keeper+ |
| GET | `/api/issues/:id/print` | Printable HTML view | store_keeper+ |
| GET | `/api/issues/search` | Search by helper name, dept, voucher# | store_keeper+ |

### Query Params for GET `/api/issues`
```typescript
{
  page?:        number
  limit?:       number
  search?:      string    // voucher#, requester name
  department?:  string    // department ID
  warehouse?:   string
  status?:      'issued' | 'partial_return' | 'fully_returned'
  dateFrom?:    string
  dateTo?:      string
  issuedBy?:    string    // storekeeper user ID
}
```

---

### Printable Issue Voucher

```
┌──────────────────────────────────────────────────────────┐
│  [COMPANY LOGO]          MATERIAL ISSUE VOUCHER          │
│  ─────────────────────────────────────────────────────── │
│  Voucher No: IV-2024-00089   Date: 19 Jun 2024  10:42 AM│
│  Warehouse: Main Store       Issued By: Ramesh Kumar     │
│  ─────────────────────────────────────────────────────── │
│  ISSUED TO                   APPROVED BY                 │
│  Name:  Suresh Kumar         Name:  Mr. Sharma           │
│  Dept:  Electrical           Desig: Electrical Supervisor│
│  Emp ID: EMP-0234            Slip Ref: EL-2024-012       │
│  ─────────────────────────────────────────────────────── │
│  S.No  Item             SKU        Qty   Unit             │
│   1    Wire Cutter 6"   ITM-00234   1    pcs              │
│   2    Electrical Tape  ITM-00089   3    roll             │
│  ─────────────────────────────────────────────────────── │
│  Remarks: ______________________________________________ │
│  ─────────────────────────────────────────────────────── │
│  Storekeeper Sign: _____________  Receiver Sign: _______ │
└──────────────────────────────────────────────────────────┘
```

Generated via `@react-pdf/renderer` or browser `window.print()` with print CSS.

---

## 3. Item Return

### Schema — `itemReturns` Collection

```typescript
{
  _id:            ObjectId,
  returnNumber:   String (unique, e.g. "RTN-2024-00001"),
  issueVoucher:   ObjectId → issueVouchers (required),  // original issue

  returnedAt:     Date (default: Date.now),
  receivedBy:     ObjectId → users,   // storekeeper receiving, from session

  // Condition of returned items
  items: [{
    issueLineId:  ObjectId,           // which line in original voucher
    item:         ObjectId → items,
    returnedQty:  Number (required),
    condition:    Enum ['good', 'damaged', 'partial_damage'],
    notes:        String,
  }],

  remarks:        String,

  createdAt:      Date,
  updatedAt:      Date,
}
```

---

### Return Flow (Service)

```typescript
export async function returnItems(
  data: CreateReturnDto,
  userId: string
): Promise<ItemReturn> {

  const voucher = await IssueVoucher.findById(data.issueVoucherId);
  if (!voucher) throw new NotFoundError('Issue Voucher');

  // Validate: returnedQty <= pendingQty for each line
  for (const line of data.items) {
    const voucherLine = voucher.items.id(line.issueLineId);
    const pending = voucherLine.issuedQty - voucherLine.returnedQty;
    if (line.returnedQty > pending) {
      throw new ValidationError(`Cannot return more than issued quantity`);
    }
  }

  // Create return record
  const returnNumber = await generateNumber('returns');
  const returnDoc = await ItemReturn.create({
    ...data,
    returnNumber,
    receivedBy: userId,
    returnedAt: new Date(),
  });

  // Add stock back (only for 'good' and 'partial_damage' condition)
  // Damaged items go back as 0 stock (write-off)
  for (const line of data.items) {
    const addBack = line.condition !== 'damaged' ? line.returnedQty : 0;

    if (addBack > 0) {
      await updateStock({
        item:      line.item,
        warehouse: voucher.warehouse,
        delta:     +addBack,
        type:      'return_in',
        reference: { type: 'return', id: returnDoc._id, number: returnNumber },
        userId,
      });
    }

    // Update returnedQty on original voucher line
    await IssueVoucher.findOneAndUpdate(
      { _id: voucher._id, 'items._id': line.issueLineId },
      { $inc: { 'items.$.returnedQty': line.returnedQty } }
    );
  }

  // Update voucher status
  await recalculateVoucherStatus(voucher._id);

  // Link return to voucher
  await IssueVoucher.findByIdAndUpdate(voucher._id, {
    $push: { returns: returnDoc._id }
  });

  return returnDoc;
}

// Recalculate status after each return
async function recalculateVoucherStatus(voucherId: ObjectId) {
  const voucher = await IssueVoucher.findById(voucherId);
  const allReturned = voucher.items.every(
    i => i.returnedQty >= i.issuedQty
  );
  const anyReturned = voucher.items.some(i => i.returnedQty > 0);

  const status = allReturned
    ? 'fully_returned'
    : anyReturned
    ? 'partial_return'
    : 'issued';

  await IssueVoucher.findByIdAndUpdate(voucherId, { status });
}
```

---

### Return Form UI — `/storekeeper/returns/new` or inline on issue detail

```
┌─────────────────────────────────────────────────────────┐
│  Return Items                                           │
│  Against: IV-2024-00089                                 │
│  Issued to: Suresh Kumar (Electrical)                   │
├─────────────────────────────────────────────────────────┤
│  Item             Issued  Prev.Ret  Pending  Return Qty  │
│  Wire Cutter 6"     1        0         1     [ 1  ]      │
│  Electrical Tape    3        1         2     [ 2  ]      │
├─────────────────────────────────────────────────────────┤
│  Condition:  ● Good   ○ Damaged   ○ Partial Damage      │
│  (per line or overall — applied to all if same)         │
├─────────────────────────────────────────────────────────┤
│  Notes       [ ________________________________________]│
├─────────────────────────────────────────────────────────┤
│              [Cancel]         [Confirm Return]           │
└─────────────────────────────────────────────────────────┘
```

### API Routes — Returns

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/returns` | Create return against an issue |
| GET | `/api/returns` | List all returns |
| GET | `/api/returns/:id` | Return detail |
| GET | `/api/issues/:id/returns` | All returns for a specific voucher |

---

## 4. Storekeeper Dashboard — `/storekeeper`

```
┌─────────────────────────────────────────────────────────┐
│  Today's Activity         19 Jun 2024  Ramesh Kumar     │
├─────────────────────────────────────────────────────────┤
│  [Issues Today: 12]  [Items Issued: 47]  [Returns: 3]  │
├─────────────────────────────────────────────────────────┤
│  Quick Issue ──────────────────────────────────────     │
│  [+ New Issue Voucher]   [Scan Barcode to Issue]        │
├─────────────────────────────────────────────────────────┤
│  Today's Issues (live)                                  │
│  IV-00089  Suresh / Electrical   3 items  10:42 AM  ●  │
│  IV-00088  Ramesh / Mechanical   1 item   09:15 AM  ↩  │
│  IV-00087  Priya  / Civil        5 items  08:30 AM  ✓  │
│  ● issued  ↩ partial return  ✓ fully returned          │
├─────────────────────────────────────────────────────────┤
│  Low Stock Alerts (my warehouse)                        │
│  ⚠ Wire 2.5mm   12 left  (min: 50)                     │
│  ⚠ Gloves L     5 left   (min: 20)                     │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Department-wise Consumption Report

Added to `MODULE_REPORTS.md` as Report #16:

```
Report: Department Consumption Report
Filters: Date range, Department, Warehouse, Item Category
Columns: Department, Total Issues, Total Items, Total Qty, Total Value,
         Top Items Consumed (top 5), Returns %, Net Consumption
Chart: Bar chart — dept vs consumption value
Export: Excel, PDF
```

---

## Updated RBAC for Storekeeper Role

| Permission | Storekeeper |
|---|---|
| View Dashboard | ✅ (own warehouse only) |
| Create Issue Voucher | ✅ |
| Confirm Issue | ✅ |
| Create Return | ✅ |
| View Issue History | ✅ |
| Create GRN | ✅ |
| View Stock Levels | ✅ (own warehouse) |
| Create/Edit Items | ❌ |
| Create PO | ❌ |
| View Reports | ✅ (issue + return reports only) |
| Settings | ❌ |

---

## Validations

```typescript
export const CreateIssueVoucherSchema = z.object({
  warehouse:  z.string().min(1, 'Warehouse is required'),

  requester: z.object({
    name:             z.string().min(2, 'Helper name is required'),
    employeeId:       z.string().optional(),
    department:       z.string().optional(),      // ObjectId or null if Other
    departmentOther:  z.string().optional(),      // required if department is null
  }).refine(
    (r) => r.department || r.departmentOther,
    { message: 'Department is required' }
  ),

  approver: z.object({
    name:           z.string().min(2, 'Approver name is required'),
    designation:    z.string().min(2, 'Designation is required'),
    slipReference:  z.string().optional(),
  }),

  items: z.array(z.object({
    item:     z.string().min(1),
    quantity: z.number().positive('Quantity must be greater than 0'),
    unit:     z.string().min(1),
    batch:    z.string().optional(),
    remarks:  z.string().optional(),
  })).min(1, 'At least one item is required'),

  remarks: z.string().optional(),
});

export const CreateReturnSchema = z.object({
  issueVoucherId: z.string().min(1),
  items: z.array(z.object({
    issueLineId:  z.string().min(1),
    item:         z.string().min(1),
    returnedQty:  z.number().positive(),
    condition:    z.enum(['good', 'damaged', 'partial_damage']),
    notes:        z.string().optional(),
  })).min(1),
  remarks: z.string().optional(),
});
```

---

## Auto-Numbering Addition

```
Returns:  RTN-{YEAR}-{SEQ:5}   e.g. RTN-2024-00001
```

Add to `SETUP.md` numbering config and `Counter` collection seeds.

---

## Summary of New Collections

| Collection | Purpose |
|---|---|
| `departments` | Department master for dropdown |
| `issueVouchers` | Updated with requester + approver blocks |
| `itemReturns` | Return records linked to original voucher |
