import { proxyRequest } from "@/lib/api-proxy";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/transfers/${params.id}/cancel`, "POST", {
    requiredPermission: "STOCK_ADJUSTMENT",
  });
}
