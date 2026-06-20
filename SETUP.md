# SETUP.md — Project Setup & Configuration
## Industrial Inventory Management System (IIMS)

---

## Prerequisites

```
Node.js     >= 18.17.0
npm         >= 9.0.0
MongoDB     >= 6.0 (Atlas or local)
Redis       >= 7.0 (optional, for caching/jobs)
Git         >= 2.40
```

---

## Tech Stack Versions

```json
{
  "next": "14.2.x",
  "react": "18.3.x",
  "typescript": "5.4.x",
  "mongoose": "8.x",
  "next-auth": "5.0.0-beta.x",
  "tailwindcss": "3.4.x",
  "@shadcn/ui": "latest",
  "zod": "3.x",
  "zustand": "4.x",
  "swr": "2.x",
  "socket.io": "4.x",
  "socket.io-client": "4.x",
  "exceljs": "4.x",
  "@react-pdf/renderer": "3.x",
  "bcryptjs": "2.x",
  "nodemailer": "6.x",
  "resend": "3.x",
  "bullmq": "5.x",
  "ioredis": "5.x",
  "lucide-react": "0.x",
  "@zxing/browser": "0.x",
  "recharts": "2.x"
}
```

---

## Project Initialization

```bash
# 1. Create Next.js app
npx create-next-app@latest iims \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd iims

# 2. Install dependencies
npm install \
  mongoose next-auth@beta \
  bcryptjs \
  zod \
  zustand swr \
  socket.io socket.io-client \
  exceljs @react-pdf/renderer \
  nodemailer resend \
  bullmq ioredis \
  @zxing/browser qrcode \
  recharts \
  lucide-react \
  date-fns \
  clsx tailwind-merge

npm install -D \
  @types/bcryptjs \
  @types/nodemailer \
  @types/qrcode

# 3. Initialize ShadCN UI
npx shadcn-ui@latest init
# Choose: Dark theme, CSS variables: yes, components.json in root

# 4. Add ShadCN components
npx shadcn-ui@latest add \
  button card input label select textarea badge \
  dialog drawer sheet table tabs dropdown-menu \
  command popover calendar date-picker \
  avatar skeleton toast progress \
  separator scroll-area checkbox radio-group \
  form alert tooltip hover-card
```

---

## Full Folder Structure

```
iims/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Sidebar + Topbar
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── inventory/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   ├── grn/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── issues/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   └── adjustments/page.tsx
│   │   │   ├── warehouses/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── zones/page.tsx
│   │   │   ├── purchase-orders/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── vendors/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── transfers/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── stock-status/page.tsx
│   │   │   │   ├── valuation/page.tsx
│   │   │   │   ├── movements/page.tsx
│   │   │   │   ├── aging/page.tsx
│   │   │   │   ├── abc-analysis/page.tsx
│   │   │   │   ├── purchase/page.tsx
│   │   │   │   ├── vendor-performance/page.tsx
│   │   │   │   └── expiry/page.tsx
│   │   │   ├── alerts/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       ├── layout.tsx
│   │   │       ├── organization/page.tsx
│   │   │       ├── users/page.tsx
│   │   │       ├── categories/page.tsx
│   │   │       ├── units/page.tsx
│   │   │       ├── numbering/page.tsx
│   │   │       ├── notifications/page.tsx
│   │   │       └── profile/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── items/
│   │   │   │   ├── route.ts             # GET list, POST create
│   │   │   │   ├── [id]/route.ts        # GET, PATCH, DELETE
│   │   │   │   ├── [id]/stock/route.ts
│   │   │   │   ├── [id]/movements/route.ts
│   │   │   │   ├── search/route.ts
│   │   │   │   ├── import/route.ts
│   │   │   │   └── export/route.ts
│   │   │   ├── stock/route.ts
│   │   │   ├── grn/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── confirm/route.ts
│   │   │   │       └── void/route.ts
│   │   │   ├── issues/
│   │   │   ├── adjustments/
│   │   │   ├── warehouses/
│   │   │   ├── purchase-orders/
│   │   │   ├── vendors/
│   │   │   ├── transfers/
│   │   │   ├── categories/
│   │   │   ├── units/
│   │   │   ├── alerts/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   └── layout.tsx                   # Root layout
│   ├── components/
│   │   ├── ui/                          # ShadCN primitives
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── SettingsSidebar.tsx
│   │   ├── shared/
│   │   │   ├── DataTable.tsx            # Reusable table with pagination
│   │   │   ├── KPICard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   └── Pagination.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardKPIs.tsx
│   │   │   ├── StockTrendChart.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── LowStockTable.tsx
│   │   │   └── AlertsPanel.tsx
│   │   ├── inventory/
│   │   │   ├── ItemsTable.tsx
│   │   │   ├── ItemForm.tsx
│   │   │   ├── ItemDetailDrawer.tsx
│   │   │   ├── StockByWarehouse.tsx
│   │   │   ├── StockHistoryTable.tsx
│   │   │   ├── GRNForm.tsx
│   │   │   ├── GRNLineItems.tsx
│   │   │   ├── IssueVoucherForm.tsx
│   │   │   ├── AdjustmentForm.tsx
│   │   │   └── BarcodeScanner.tsx
│   │   ├── purchase/
│   │   │   ├── VendorsTable.tsx
│   │   │   ├── VendorForm.tsx
│   │   │   ├── POTable.tsx
│   │   │   ├── POForm.tsx
│   │   │   ├── POLineItems.tsx
│   │   │   └── POStatusTimeline.tsx
│   │   ├── warehouse/
│   │   │   ├── WarehouseCard.tsx
│   │   │   ├── ZoneManager.tsx
│   │   │   ├── TransferForm.tsx
│   │   │   └── TransferLineItems.tsx
│   │   ├── reports/
│   │   │   ├── ReportSidebar.tsx
│   │   │   ├── ReportTable.tsx
│   │   │   ├── ExportButton.tsx
│   │   │   └── charts/
│   │   ├── alerts/
│   │   │   ├── AlertCenter.tsx
│   │   │   ├── AlertBell.tsx
│   │   │   └── AlertCard.tsx
│   │   └── settings/
│   │       ├── CategoryTree.tsx
│   │       └── NumberingConfig.tsx
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── config.ts
│   │   │   └── permissions.ts
│   │   ├── db/
│   │   │   ├── connect.ts
│   │   │   └── models/
│   │   │       ├── User.model.ts
│   │   │       ├── Item.model.ts
│   │   │       ├── Stock.model.ts
│   │   │       ├── StockMovement.model.ts
│   │   │       ├── GRN.model.ts
│   │   │       ├── IssueVoucher.model.ts
│   │   │       ├── Batch.model.ts
│   │   │       ├── SerialNumber.model.ts
│   │   │       ├── PurchaseOrder.model.ts
│   │   │       ├── Vendor.model.ts
│   │   │       ├── Warehouse.model.ts
│   │   │       ├── Transfer.model.ts
│   │   │       ├── Category.model.ts
│   │   │       ├── Unit.model.ts
│   │   │       ├── Alert.model.ts
│   │   │       ├── Counter.model.ts
│   │   │       └── Setting.model.ts
│   │   ├── services/
│   │   │   ├── inventory.service.ts
│   │   │   ├── stock.service.ts
│   │   │   ├── grn.service.ts
│   │   │   ├── po.service.ts
│   │   │   ├── vendor.service.ts
│   │   │   ├── warehouse.service.ts
│   │   │   ├── transfer.service.ts
│   │   │   ├── alert.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── reports.service.ts
│   │   │   └── export.service.ts
│   │   ├── validations/
│   │   │   ├── item.schema.ts
│   │   │   ├── grn.schema.ts
│   │   │   ├── po.schema.ts
│   │   │   ├── vendor.schema.ts
│   │   │   ├── warehouse.schema.ts
│   │   │   └── transfer.schema.ts
│   │   ├── socket/
│   │   │   ├── server.ts
│   │   │   └── client.ts
│   │   ├── queue/
│   │   │   ├── workers.ts
│   │   │   └── jobs/
│   │   │       ├── check-po-overdue.ts
│   │   │       ├── check-batch-expiry.ts
│   │   │       └── send-report-email.ts
│   │   ├── utils/
│   │   │   ├── format.ts           # Currency, date, number formatting
│   │   │   ├── numbering.ts        # Auto-number generation
│   │   │   └── cn.ts               # clsx + tailwind-merge
│   │   └── constants.ts
│   ├── stores/                     # Zustand stores
│   │   ├── auth.store.ts
│   │   ├── ui.store.ts
│   │   └── alerts.store.ts
│   ├── hooks/                      # Custom React hooks
│   │   ├── useItems.ts
│   │   ├── useStock.ts
│   │   ├── useAlerts.ts
│   │   └── useDebounce.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── inventory.ts
│   │   ├── purchase.ts
│   │   └── reports.ts
│   └── styles/
│       └── globals.css
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local
├── .env.example
├── package.json
└── README.md
```

---

## Environment Variables

### `.env.example`
```env
# App
NEXTAUTH_SECRET=your-secret-here-minimum-32-chars
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/iims?retryWrites=true&w=majority

# Redis (optional, for caching and job queue)
REDIS_URL=redis://localhost:6379

# Cloudinary (file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Resend)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Socket.io
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

---

## MongoDB Connection (`lib/db/connect.ts`)

```typescript
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

declare global {
  var mongoose: { conn: typeof import("mongoose") | null; promise: Promise<typeof import("mongoose")> | null };
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

---

## Tailwind Config

```typescript
// tailwind.config.ts
export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     '#0D0F14',
          surface:  '#151820',
          elevated: '#1C2030',
          overlay:  '#232838',
        },
        accent: {
          primary:   '#3B82F6',
          secondary: '#10B981',
          warning:   '#F59E0B',
          danger:    '#EF4444',
          info:      '#6366F1',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

---

## Scripts

```json
{
  "scripts": {
    "dev":   "next dev",
    "build": "next build",
    "start": "next start",
    "lint":  "next lint",
    "type-check": "tsc --noEmit",
    "seed":  "tsx scripts/seed.ts",
    "db:reset": "tsx scripts/reset-db.ts"
  }
}
```

---

## Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel --prod

# Environment variables: add via Vercel dashboard
# MongoDB Atlas: add Vercel IPs to allowlist
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env.local
    depends_on: [redis]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```
