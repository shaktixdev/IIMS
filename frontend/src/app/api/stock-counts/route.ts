import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  return proxyRequest(req, "/stock-counts", "GET");
}

export async function POST(req: Request) {
  return proxyRequest(req, "/stock-counts", "POST", {
    requiredPermission: "STOCK_ADJUSTMENT",
  });
}
