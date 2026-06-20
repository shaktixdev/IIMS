import { proxyRequest } from "@/lib/api-proxy";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/items/${params.id}`, "GET");
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/items/${params.id}`, "PATCH", {
    requiredPermission: "MANAGE_ITEMS",
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/items/${params.id}`, "DELETE", {
    requiredPermission: "DELETE_ITEMS",
  });
}
