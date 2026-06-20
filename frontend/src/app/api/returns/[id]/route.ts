import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return proxyRequest(req, `/returns/${params.id}`, "GET");
}
