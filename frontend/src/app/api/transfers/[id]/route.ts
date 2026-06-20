import { proxyRequest } from "@/lib/api-proxy";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/transfers/${params.id}`, "GET");
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/transfers/${params.id}`, "PATCH", {
    requiredPermission: "ISSUE_STOCK",
  });
}
