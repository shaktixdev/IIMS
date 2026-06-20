# MODULE_AUTH.md — Authentication & RBAC Module
## Industrial Inventory Management System (IIMS)

---

## Overview

Handles user authentication, session management, and role-based access control across the entire platform.

**Tech:** NextAuth.js v5 · Mongoose · bcryptjs · Zod · next/middleware

---

## Roles & Permissions Matrix

| Permission | Super Admin | Admin | Manager | Store Keeper | Procurement | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add/Edit Items | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Items | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create GRN | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve GRN | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create PO | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Approve PO | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Issue Stock | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Transfer | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Stock Adjustment | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Export Data | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Vendors | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| View Audit Log | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts
├── lib/
│   ├── auth/
│   │   ├── config.ts          # NextAuth config
│   │   ├── permissions.ts     # Permission constants
│   │   └── middleware.ts      # Route protection helpers
│   └── db/
│       └── models/
│           └── User.model.ts
├── middleware.ts               # Global route guard
└── components/
    └── auth/
        ├── LoginForm.tsx
        └── ProtectedRoute.tsx
```

---

## Core Implementation

### NextAuth Config (`lib/auth/config.ts`)
```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import User from "@/lib/db/models/User.model";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await User.findOne({ email: credentials.email, isActive: true });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
});
```

### Permission System (`lib/auth/permissions.ts`)
```typescript
export const ROLES = {
  SUPER_ADMIN:  'super_admin',
  ADMIN:        'admin',
  MANAGER:      'manager',
  STORE_KEEPER: 'store_keeper',
  PROCUREMENT:  'procurement',
  VIEWER:       'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  MANAGE_USERS:       ['super_admin', 'admin'],
  MANAGE_ITEMS:       ['super_admin', 'admin', 'manager'],
  DELETE_ITEMS:       ['super_admin', 'admin'],
  CREATE_GRN:         ['super_admin', 'admin', 'manager', 'store_keeper'],
  APPROVE_GRN:        ['super_admin', 'admin', 'manager'],
  CREATE_PO:          ['super_admin', 'admin', 'manager', 'procurement'],
  APPROVE_PO:         ['super_admin', 'admin', 'manager'],
  ISSUE_STOCK:        ['super_admin', 'admin', 'manager', 'store_keeper'],
  STOCK_ADJUSTMENT:   ['super_admin', 'admin', 'manager'],
  VIEW_REPORTS:       ['super_admin', 'admin', 'manager', 'procurement', 'viewer'],
  EXPORT_DATA:        ['super_admin', 'admin', 'manager', 'procurement'],
  MANAGE_SETTINGS:    ['super_admin', 'admin'],
  MANAGE_VENDORS:     ['super_admin', 'admin', 'manager', 'procurement'],
} as const;

export function hasPermission(role: Role, permission: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}
```

### Route Middleware (`middleware.ts`)
```typescript
import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');

  if (isAuthPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/dashboard', req.url));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## API Routes

### `POST /api/auth/[...nextauth]`
Handled by NextAuth — login, logout, session refresh.

### `GET /api/users`
List all users. Permission: `MANAGE_USERS`

### `POST /api/users`
Create a new user. Permission: `MANAGE_USERS`
```typescript
Body: {
  name: string
  email: string
  password: string
  role: Role
  warehouseAccess?: string[]
  phone?: string
  department?: string
}
```

### `PATCH /api/users/:id`
Update user. Permission: `MANAGE_USERS`

### `DELETE /api/users/:id`
Soft-deactivate user (sets `isActive: false`). Permission: `SUPER_ADMIN`

### `POST /api/users/change-password`
User changes own password.
```typescript
Body: { currentPassword: string, newPassword: string }
```

---

## UI Pages

### Login Page (`/login`)
- Email + password form
- "Remember me" checkbox
- Error state: wrong credentials
- Redirect to `/dashboard` on success
- Branding: logo + product name
- No sign-up (admin creates users)

### User Management Page (`/settings/users`)
- Table: Name, Email, Role, Last Login, Status, Actions
- Add User modal (form)
- Edit User drawer
- Deactivate/Reactivate toggle
- Role badge color coding

---

## Security

- Passwords hashed with bcrypt (saltRounds: 12)
- JWT stored in httpOnly cookie
- CSRF protection via NextAuth built-in
- All API routes validate session server-side
- Role checked on both frontend (hide UI) and backend (reject request)
- Failed login attempts: rate-limit via `next-rate-limit` (5 attempts / 15 min)
- Password reset: email OTP flow (Phase 2)

---

## Types

```typescript
// types/auth.ts
export interface SessionUser {
  id:     string;
  name:   string;
  email:  string;
  role:   Role;
  avatar?: string;
}

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    id:   string;
  }
}
```
