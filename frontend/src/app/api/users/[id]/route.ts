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

type Params = { params: Promise<{ id: string }> };

// PATCH /api/users/[id]  — update user
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "MANAGE_USERS")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/users/${id}`, {
      method: "PATCH",
      headers: backendHeaders(session.user.role, session.user.id),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "BACKEND_ERROR", message: "Failed to reach backend" } }, { status: 502 });
  }
}

// DELETE /api/users/[id]  — soft deactivate (super_admin only)
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  // SUPER_ADMIN only — backend also enforces this
  if (session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Only Super Admins can deactivate users." } }, { status: 403 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/users/${id}`, {
      method: "DELETE",
      headers: backendHeaders(session.user.role, session.user.id),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "BACKEND_ERROR", message: "Failed to reach backend" } }, { status: 502 });
  }
}
