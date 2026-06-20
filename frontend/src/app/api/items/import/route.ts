import { proxyRequest } from "@/lib/api-proxy";

export async function POST(req: Request) {
  return proxyRequest(req, "/items/import", "POST", {
    requiredPermission: "MANAGE_ITEMS",
  });
}
