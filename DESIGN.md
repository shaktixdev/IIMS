# DESIGN.md — UI/UX Design System
## Industrial Inventory Management System (IIMS)

---

## 1. Design Philosophy

**Direction:** Industrial Precision — not corporate SaaS gray, not consumer-app playful.  
The UI should feel like the instrument panel of a modern factory: dense with real data, instantly readable, zero decoration for its own sake.

**Core Principle:** Every pixel earns its place. If it doesn't communicate stock status, trigger an action, or reveal a relationship — it doesn't exist.

**Tone:** Professional, efficient, trustworthy. The UI should make a warehouse supervisor feel in control, not confused.

---

## 2. Color System

### Primary Palette
```
--color-bg-base:       #0D0F14   /* Deep carbon — primary background */
--color-bg-surface:    #151820   /* Elevated card/panel surface */
--color-bg-elevated:   #1C2030   /* Modal, dropdown backgrounds */
--color-bg-overlay:    #232838   /* Hover states, table row hover */

--color-accent-primary:   #3B82F6  /* Electric blue — CTAs, links, focus rings */
--color-accent-secondary: #10B981  /* Emerald — success, "In Stock", approved */
--color-accent-warning:   #F59E0B  /* Amber — low stock, pending states */
--color-accent-danger:    #EF4444  /* Red — out of stock, overdue, critical alerts */
--color-accent-info:      #6366F1  /* Indigo — info states, secondary data */

--color-text-primary:  #F1F5F9   /* Primary readable text */
--color-text-secondary:#94A3B8   /* Labels, metadata, subdued text */
--color-text-muted:    #475569   /* Disabled, placeholder text */

--color-border:        #1E2535   /* Subtle dividers */
--color-border-active: #3B82F6   /* Focus / selected borders */
```

### Status Color Tokens
```
IN_STOCK:       #10B981  (Emerald)
LOW_STOCK:      #F59E0B  (Amber)
OUT_OF_STOCK:   #EF4444  (Red)
OVERSTOCKED:    #6366F1  (Indigo)
RESERVED:       #8B5CF6  (Purple)
IN_TRANSIT:     #3B82F6  (Blue)
EXPIRED:        #DC2626  (Deep Red)
```

### Chart Palette (sequential for multi-series)
```
Series 1: #3B82F6
Series 2: #10B981
Series 3: #F59E0B
Series 4: #8B5CF6
Series 5: #EC4899
Series 6: #06B6D4
```

---

## 3. Typography

### Type Scale
```
Font Roles:
  Display:   "Inter" (variable) — weights 600–800, for headings
  Body:      "Inter" (variable) — weights 400–500, for all readable text
  Mono:      "JetBrains Mono" — for SKUs, codes, numbers, stock values

Scale (rem):
  --text-xs:   0.75rem  / 12px  — table metadata, labels
  --text-sm:   0.875rem / 14px  — body default, form inputs
  --text-base: 1rem     / 16px  — card content
  --text-lg:   1.125rem / 18px  — section headings
  --text-xl:   1.25rem  / 20px  — page sub-titles
  --text-2xl:  1.5rem   / 24px  — page titles
  --text-3xl:  1.875rem / 30px  — dashboard KPI numbers
  --text-4xl:  2.25rem  / 36px  — hero metrics

Line Heights:
  Tight:   1.25  (headings)
  Normal:  1.5   (body)
  Relaxed: 1.75  (long descriptions)

Letter Spacing:
  Headings:    -0.02em
  Mono/Codes:  0.05em
  Labels:      0.08em (uppercase tracking)
```

---

## 4. Spacing System

Based on 4px base unit:

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-20: 80px
```

---

## 5. Border Radius

```
--radius-sm:   4px   (badges, tags, inputs)
--radius-md:   8px   (cards, buttons)
--radius-lg:   12px  (modals, panels)
--radius-xl:   16px  (large feature cards)
--radius-full: 9999px (pills, avatar rings)
```

---

## 6. Shadow System

```
--shadow-sm:  0 1px 2px rgba(0,0,0,0.4)
--shadow-md:  0 4px 12px rgba(0,0,0,0.35)
--shadow-lg:  0 8px 32px rgba(0,0,0,0.5)
--shadow-glow-blue:    0 0 16px rgba(59,130,246,0.25)
--shadow-glow-green:   0 0 16px rgba(16,185,129,0.2)
--shadow-glow-red:     0 0 16px rgba(239,68,68,0.2)
```

---

## 7. Layout Architecture

### Global Layout
```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed)    │  MAIN CONTENT AREA              │
│  ┌──────────────────────┐ │  ┌──────────────────────────┐  │
│  │  Logo + Brand        │ │  │  Topbar (64px)            │  │
│  │  ──────────────────  │ │  │  Breadcrumb / Page Title  │  │
│  │  Nav Groups:         │ │  │  Action Buttons           │  │
│  │  • Dashboard         │ │  └──────────────────────────┘  │
│  │  • Inventory         │ │  ┌──────────────────────────┐  │
│  │  • Warehouses        │ │  │  Page Content             │  │
│  │  • Purchase Orders   │ │  │  (Scrollable)             │  │
│  │  • Vendors           │ │  │                           │  │
│  │  • Transfers         │ │  │                           │  │
│  │  • Reports           │ │  └──────────────────────────┘  │
│  │  • Settings          │ │                                 │
│  │  ──────────────────  │ │                                 │
│  │  User Profile        │ │                                 │
│  └──────────────────────┘ │                                 │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard Layout
```
┌─────────────────────────────────────────────────────┐
│  KPI Cards Row (4 cards)                            │
│  [Total SKUs] [Low Stock] [Pending POs] [Stock Value]│
├─────────────────────────────────────────────────────┤
│  Chart (60%)          │  Activity Feed (40%)        │
│  Stock Trend Line     │  Recent Movements           │
├─────────────────────────────────────────────────────┤
│  Top Moving Items     │  Alerts Panel               │
│  (Table)              │  (Critical items)           │
└─────────────────────────────────────────────────────┘
```

### Data Table Layout
```
┌─────────────────────────────────────────────────────┐
│  Page Title           [+ Add]  [Export ▼]           │
├─────────────────────────────────────────────────────┤
│  Search ▢   Filters ▼   Status ▼   Warehouse ▼     │
├─────────────────────────────────────────────────────┤
│  ☐  SKU      │ Name    │ Category │ Stock │ Status  │
│  ☐  ITM-001  │ Bolt M6 │ Fastener │  450  │ ●In Stock│
│  ☐  ITM-002  │ Valve A │ Hydraulic│   12  │ ●Low    │
├─────────────────────────────────────────────────────┤
│  Showing 1–25 of 1,204       [← 1 2 3 4 5 →]      │
└─────────────────────────────────────────────────────┘
```

---

## 8. Component Library

### 8.1 Buttons
```
Variants:
  Primary:    bg-accent-primary, white text, md radius
  Secondary:  bg-bg-elevated, border, text-primary
  Ghost:      transparent, hover bg-overlay
  Danger:     bg-danger, white text
  Icon-only:  square, ghost style

Sizes:
  sm:  h-8  px-3 text-sm
  md:  h-9  px-4 text-sm  (default)
  lg:  h-10 px-6 text-base
```

### 8.2 KPI Card
```
┌────────────────────────────┐
│  ↗ icon (colored)          │
│                            │
│  12,450                    │  ← text-3xl mono bold
│  Total SKUs                │  ← text-sm secondary
│                            │
│  ▲ 12% vs last month       │  ← text-xs green/red
└────────────────────────────┘
Border: 1px border-border
Background: bg-surface
Left border accent: 4px solid accent color
```

### 8.3 Status Badge
```
Pill shape (radius-full)
Size: px-2.5 py-0.5 text-xs font-medium

IN_STOCK:       bg-emerald-500/10 text-emerald-400
LOW_STOCK:      bg-amber-500/10  text-amber-400
OUT_OF_STOCK:   bg-red-500/10   text-red-400
IN_TRANSIT:     bg-blue-500/10  text-blue-400
RESERVED:       bg-violet-500/10 text-violet-400
```

### 8.4 Data Table
```
thead:  bg-bg-elevated, text-xs uppercase, tracking-wide, text-secondary
tbody:  hover bg-overlay, transition
rows:   border-b border-border
cells:  px-4 py-3 text-sm
sticky first col for checkboxes
sticky last col for actions
```

### 8.5 Sidebar Navigation
```
Group Labels:   text-xs uppercase tracking-widest text-muted
Nav Item:       flex gap-3 px-3 py-2 rounded-md
  - Default:    text-secondary
  - Hover:      bg-overlay text-primary
  - Active:     bg-accent-primary/10 text-accent-primary border-l-2 border-accent-primary
Icons:          16px, Lucide React
Badge (count):  inline, text-xs, bg-accent-primary
```

### 8.6 Form Inputs
```
Input:    bg-bg-elevated border border-border rounded-md h-9 px-3
          focus: border-accent-primary ring-1 ring-accent-primary/30
          placeholder: text-muted
          font: text-sm

Select:   Same style + ChevronDown icon
Textarea: min-h-[80px] resize-y
Checkbox: accent-primary, 16px
Label:    text-sm text-secondary font-medium mb-1.5
Error:    text-xs text-danger mt-1
Helper:   text-xs text-muted mt-1
```

### 8.7 Modal / Drawer
```
Backdrop:   bg-black/60 blur-sm
Modal:      bg-bg-surface rounded-lg shadow-lg max-w-lg w-full
            border border-border
Header:     px-6 py-4 border-b border-border
Body:       px-6 py-4
Footer:     px-6 py-4 border-t border-border flex justify-end gap-3

Drawer:     slides from right, 480px wide
            used for: item details, PO view, transfer detail
```

### 8.8 Alert / Notification Toast
```
Position:   top-right, stacked
Variants:
  Success:  border-l-4 border-emerald-500 bg-bg-elevated
  Warning:  border-l-4 border-amber-500
  Error:    border-l-4 border-red-500
  Info:     border-l-4 border-blue-500

Duration:   5s auto-dismiss, hover to pause
```

### 8.9 Empty State
```
Icon (large, muted) centered
Title: text-lg text-primary
Description: text-sm text-secondary max-w-sm centered
CTA button below

Usage: empty tables, no search results, no alerts
```

---

## 9. Page-Level Designs

### 9.1 Dashboard
- 4-column KPI strip at top
- Stock trend chart (area, last 30 days) left
- Recent activity timeline right
- Low-stock table below (top 10)
- Alert panel: overdue POs, expiring items

### 9.2 Inventory / Item List
- Full-width data table
- Left sidebar filter panel (collapsible)
- Bulk actions bar on selection
- Quick-view drawer on row click

### 9.3 Item Detail
- 2-column layout: item info left, stock by warehouse right
- Tab navigation: Overview / Stock History / PO History / Attachments
- Inline edit mode (no separate edit page)

### 9.4 GRN (Goods Receipt Note)
- Step-based form (Wizard): Select PO → Verify Items → Enter Quantities → Confirm
- Items table with expected vs received columns
- Discrepancy highlight in red

### 9.5 Purchase Order
- Header section: Vendor, Date, Reference
- Line items table: add/remove rows inline
- Auto-total computation
- Status timeline at top right

### 9.6 Reports
- Report selector left panel
- Preview right panel
- Filter bar at top
- Export buttons: PDF / Excel

---

## 10. Iconography

**Library:** Lucide React (consistent, clean, industrial weight)

Key icons per module:
```
Dashboard:    LayoutDashboard
Inventory:    Package
Warehouse:    Warehouse
Purchase:     ShoppingCart
Vendors:      Truck
Transfers:    ArrowLeftRight
Reports:      BarChart3
Settings:     Settings2
GRN:          PackagePlus
Issue:        PackageMinus
Alerts:       Bell
Scan:         ScanLine
User:         User2
Export:       Download
Add:          Plus
Filter:       SlidersHorizontal
Search:       Search
```

---

## 11. Responsive Strategy

| Breakpoint | Layout |
|---|---|
| < 768px (Mobile) | Single column, hamburger nav, simplified tables |
| 768–1024px (Tablet) | Collapsed sidebar, 2-col grids |
| 1024–1440px (Desktop) | Full layout as designed |
| > 1440px (Large) | Max content width 1440px, centered |

Mobile-specific:
- Sidebar becomes bottom sheet or hamburger drawer
- Tables scroll horizontally with sticky first column
- KPI cards scroll horizontally in a single row
- Modals become full-screen drawers

---

## 12. Motion & Animation

```
Transitions:    150ms ease-out (hover states, color changes)
Slide-in:       200ms ease-out translateX (drawer open)
Fade:           150ms ease (modal backdrop)
Skeleton loader: shimmer animation for table/card loading

Reduce motion:  @media (prefers-reduced-motion: reduce)
                → disable all transitions/animations
```

---

## 13. Accessibility

- All interactive elements: visible focus ring (2px accent-primary offset-2)
- Color not used as sole status indicator (icon + text + color)
- ARIA labels on all icon buttons
- Table: `role="table"`, `scope` on `<th>`
- Skip to content link at top
- Keyboard nav: Tab, Enter, Escape, Arrow keys in dropdowns
- Minimum contrast: 4.5:1 for normal text (WCAG AA)

---

## 14. Dark Mode

**Default:** Dark mode is the primary design.  
**Light mode:** Available as toggle, stored in user preferences.  
CSS variables swap via `[data-theme="light"]` class on `<html>`.

---

## 15. File Structure (UI Layer)

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   └── (dashboard)/
│       ├── layout.tsx            # Sidebar + Topbar shell
│       ├── page.tsx              # Dashboard
│       ├── inventory/
│       ├── warehouses/
│       ├── purchase-orders/
│       ├── vendors/
│       ├── transfers/
│       ├── reports/
│       └── settings/
├── components/
│   ├── ui/                       # ShadCN primitives
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── PageHeader.tsx
│   ├── dashboard/
│   ├── inventory/
│   ├── shared/
│   │   ├── DataTable.tsx
│   │   ├── KPICard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── EmptyState.tsx
│   │   └── ConfirmDialog.tsx
│   └── forms/
├── lib/
│   ├── utils.ts
│   └── constants.ts
├── styles/
│   └── globals.css               # CSS variables + base
└── types/
    └── index.ts
```
