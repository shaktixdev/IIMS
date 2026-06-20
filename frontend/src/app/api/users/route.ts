import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:5000/api";

function backendHeaders(role: string, id: string) {
  return {
    "Content-Type": "application/json",
    "x-user-role": role,
    "x-user-id": id,
  };
}

// GET /api/users  — list all users
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "MANAGE_USERS")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/users`, {
      headers: backendHeaders(session.user.role, session.user.id),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "BACKEND_ERROR", message: "Failed to reach backend" } }, { status: 502 });
  }
}

// POST /api/users  — create user
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "MANAGE_USERS")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/users`, {
      method: "POST",
      headers: backendHeaders(session.user.role, session.user.id),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "BACKEND_ERROR", message: "Failed to reach backend" } }, { status: 502 });
  }
}
