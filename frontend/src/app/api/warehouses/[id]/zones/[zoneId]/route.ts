import { proxyRequest } from "@/lib/api-proxy";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; zoneId: string } }
) {
  return proxyRequest(req, `/warehouses/${params.id}/zones/${params.zoneId}`, "PATCH", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; zoneId: string } }
) {
  return proxyRequest(req, `/warehouses/${params.id}/zones/${params.zoneId}`, "DELETE", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}
