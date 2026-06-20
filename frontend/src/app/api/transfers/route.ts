import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  return proxyRequest(req, "/transfers", "GET");
}

export async function POST(req: Request) {
  return proxyRequest(req, "/transfers", "POST", {
    requiredPermission: "ISSUE_STOCK",
  });
}
