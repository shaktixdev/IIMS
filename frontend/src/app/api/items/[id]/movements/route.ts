import { proxyRequest } from "@/lib/api-proxy";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const queryString = searchParams.toString();
  const endpoint = `/items/${params.id}/movements${queryString ? `?${queryString}` : ""}`;
  return proxyRequest(req as any, endpoint, "GET");
}
