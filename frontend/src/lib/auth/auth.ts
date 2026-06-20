import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const backendUrl = process.env.BACKEND_API_URL || "http://localhost:5000/api";

        try {
          const res = await fetch(`${backendUrl}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            return null;
          }

          const data = await res.json();

          if (data && data.success && data.data) {
            return {
              id: data.data.id,
              name: data.data.name,
              email: data.data.email,
              role: data.data.role,
              avatar: data.data.avatar || "",
            };
          }
        } catch (error) {
          console.error("NextAuth authorize API fetch error:", error);
        }

        return null;
      },
    }),
  ],
});
