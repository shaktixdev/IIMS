import { proxyRequest } from "@/lib/api-proxy";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return proxyRequest(req, `/alerts/${params.id}`, "DELETE");
}
