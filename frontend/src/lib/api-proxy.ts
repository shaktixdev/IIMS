import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import { hasPermission, Permission } from "@/lib/auth/permissions";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:5005/api";

export async function proxyRequest(
  req: Request,
  endpoint: string,
  method: string,
  options?: {
    requiredPermission?: Permission;
    customBody?: unknown;
  }
) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  if (options?.requiredPermission) {
    if (!hasPermission(session.user.role, options.requiredPermission)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }
  }

  let body = options?.customBody;
  if (!body && method !== "GET" && method !== "HEAD") {
    try {
      body = await req.json();
    } catch {
      // Body might be empty
    }
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-user-role": session.user.role || "",
        "x-user-id": session.user.id || "",
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(`${BACKEND_URL}${endpoint}`, fetchOptions);
    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to communicate with backend";
    console.error(`API Proxy Error [${method} ${endpoint}]:`, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: errMsg,
        },
      },
      { status: 500 }
    );
  }
}
