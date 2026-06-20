import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  const { search } = new URL(req.url);
  return proxyRequest(req, `/issues${search}`, "GET");
}

export async function POST(req: Request) {
  return proxyRequest(req, "/issues", "POST", {
    requiredPermission: "ISSUE_STOCK",
  });
}
