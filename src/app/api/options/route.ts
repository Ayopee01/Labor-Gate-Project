import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.GATE_BASE_URL;
  const clientId = process.env.GATE_CLIENT_ID;
  const clientSecret = process.env.GATE_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error("Missing required env var: GATE_BASE_URL, GATE_CLIENT_ID or GATE_CLIENT_SECRET");
  }

  const marketCode = request.nextUrl.searchParams.get("MarketCode");

  const url = new URL("/api/gate/options", baseUrl);
  if (marketCode) {
    url.searchParams.set("MarketCode", marketCode);
  }

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Gate options request failed: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load gate options", error);
    return NextResponse.json({ message: "Failed to load options" }, { status: 502 });
  }
}
