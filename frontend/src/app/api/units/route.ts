import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  return proxyRequest(req, "/units", "GET");
}

export async function POST(req: Request) {
  return proxyRequest(req, "/units", "POST", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}
