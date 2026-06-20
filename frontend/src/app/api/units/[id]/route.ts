import { proxyRequest } from "@/lib/api-proxy";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  return proxyRequest(req, `/units/${params.id}`, "PATCH", {
    requiredPermission: "MANAGE_SETTINGS",
  });
}
