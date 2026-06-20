import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/vendors/${params.id}/pos?${queryString}` : `/vendors/${params.id}/pos`;
  return proxyRequest(req, endpoint, "GET");
}
