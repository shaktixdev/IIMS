import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  return proxyRequest(req, "/settings/organization", "GET");
}

export async function PATCH(req: Request) {
  return proxyRequest(req, "/settings/organization", "PATCH", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}
