import { proxyRequest } from "@/lib/api-proxy";

export async function POST(req: Request) {
  return proxyRequest(req, "/purchase-orders/auto", "POST", {
    requiredPermission: "CREATE_PO",
  });
}
