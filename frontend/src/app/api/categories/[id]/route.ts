import { proxyRequest } from "@/lib/api-proxy";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/categories/${params.id}`, "PATCH", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/categories/${params.id}`, "DELETE", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}
