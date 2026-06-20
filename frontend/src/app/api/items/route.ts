import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/items?${queryString}` : "/items";
  return proxyRequest(req, endpoint, "GET");
}

export async function POST(req: Request) {
  return proxyRequest(req, "/items", "POST", {
    requiredPermission: "MANAGE_ITEMS",
  });
}
