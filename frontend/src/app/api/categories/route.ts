import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  return proxyRequest(req, "/categories", "GET");
}

export async function POST(req: Request) {
  return proxyRequest(req, "/categories", "POST", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}
