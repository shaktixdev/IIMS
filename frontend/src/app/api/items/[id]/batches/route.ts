import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const warehouse = url.searchParams.get("warehouse") || "";
  return proxyRequest(req, `/items/${params.id}/batches?warehouse=${warehouse}`, "GET");
}
