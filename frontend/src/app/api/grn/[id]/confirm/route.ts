import { proxyRequest } from "@/lib/api-proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return proxyRequest(req, `/grn/${params.id}/confirm`, "POST", {
    requiredPermission: "APPROVE_GRN",
  });
}
