import { proxyRequest } from "@/lib/api-proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return proxyRequest(req, `/purchase-orders/${params.id}/close`, "POST", {
    requiredPermission: "APPROVE_PO",
  });
}
