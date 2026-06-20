import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return proxyRequest(req, `/vendors/${params.id}`, "GET");
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return proxyRequest(req, `/vendors/${params.id}`, "PATCH", {
    requiredPermission: "MANAGE_VENDORS",
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return proxyRequest(req, `/vendors/${params.id}`, "DELETE", {
    requiredPermission: "MANAGE_VENDORS",
  });
}
