import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  return proxyRequest(req, "/warehouses", "GET");
}

export async function POST(req: Request) {
  return proxyRequest(req, "/warehouses", "POST", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}
