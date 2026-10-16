import { NextRequest } from "next/server";
import { gateFetch, toNextResponse } from "@/lib/gateClient";

export async function GET(request: NextRequest) {
  const marketCode = request.nextUrl.searchParams.get("MarketCode");
  const result = await gateFetch("/api/gate/options", {
    searchParams: marketCode ? { MarketCode: marketCode } : undefined,
  });

  if (result.status >= 400) {
    console.error("Failed to load gate options", result.status, JSON.stringify(result.body));
  }
  return toNextResponse(result);
}
