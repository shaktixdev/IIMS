import { proxyRequest } from "@/lib/api-proxy";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/stock-counts/${params.id}/complete`, "POST", {
    requiredPermission: "STOCK_ADJUSTMENT",
  });
}
