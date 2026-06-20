import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return proxyRequest(req, `/grn/${params.id}`, "GET");
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return proxyRequest(req, `/grn/${params.id}`, "PATCH", {
    requiredPermission: "CREATE_GRN",
  });
}
