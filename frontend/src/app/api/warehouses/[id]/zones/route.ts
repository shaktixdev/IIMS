import { proxyRequest } from "@/lib/api-proxy";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/warehouses/${params.id}/zones`, "POST", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}
