import { proxyRequest } from "@/lib/api-proxy";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/transfers/${params.id}/dispatch`, "POST", {
    requiredPermission: "ISSUE_STOCK",
  });
}
