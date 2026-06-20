import { proxyRequest } from "@/lib/api-proxy";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/stock-counts/${params.id}`, "GET");
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/stock-counts/${params.id}`, "PATCH", {
    requiredPermission: "STOCK_ADJUSTMENT",
  });
}
