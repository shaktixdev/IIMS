import { proxyRequest } from "@/lib/api-proxy";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return proxyRequest(req, `/alerts/${params.id}/read`, "PATCH");
}
