import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const limit = searchParams.get("limit") || "10";
  return proxyRequest(req, `/items/search?q=${encodeURIComponent(q)}&limit=${limit}`, "GET");
}
