import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  return proxyRequest(req, "/settings/numbering", "GET");
}

export async function PATCH(req: Request) {
  return proxyRequest(req, "/settings/numbering", "PATCH", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}
