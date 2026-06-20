import { proxyRequest } from "@/lib/api-proxy";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req as any, `/purchase-orders/${params.id}/approve`, "POST", {
    requiredPermission: "APPROVE_PO",
  });
}
