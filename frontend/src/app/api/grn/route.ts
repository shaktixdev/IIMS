import { proxyRequest } from "@/lib/api-proxy";

export async function GET(req: Request) {
  // Pass search params like ?page=1&limit=25
  const { search } = new URL(req.url);
  return proxyRequest(req, `/grn${search}`, "GET");
}

export async function POST(req: Request) {
  return proxyRequest(req, "/grn", "POST", {
    requiredPermission: "CREATE_GRN",
  });
}
