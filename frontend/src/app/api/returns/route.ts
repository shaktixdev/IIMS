import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  const { search } = new URL(req.url);
  return proxyRequest(req, `/returns${search}`, "GET");
}

export async function POST(req: Request) {
  return proxyRequest(req, "/returns", "POST", {
    requiredPermission: "ISSUE_STOCK",
  });
}
