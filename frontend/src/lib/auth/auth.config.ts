import type { NextAuthConfig } from "next-auth";

export type Role = "super_admin" | "admin" | "manager" | "store_keeper" | "procurement" | "viewer";

export const ROLES = {
  SUPER_ADMIN:  "super_admin",
  ADMIN:        "admin",
  MANAGER:      "manager",
  STORE_KEEPER: "store_keeper",
  PROCUREMENT:  "procurement",
  VIEWER:       "viewer",
} as const;

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" as const, maxAge: 24 * 60 * 60 },
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
        session.user.role = token.role as Role;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // Empty array, credentials will be added in full auth.ts config
} satisfies NextAuthConfig;
