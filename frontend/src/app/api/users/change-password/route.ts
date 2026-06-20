import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:5000/api";

// POST /api/users/change-password
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/users/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": session.user.role,
        "x-user-id": session.user.id,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "BACKEND_ERROR", message: "Failed to reach backend" } }, { status: 502 });
  }
}
