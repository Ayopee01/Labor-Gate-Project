import { NextRequest, NextResponse } from "next/server";
import { getRedisClient, peekNextTicketNo, previewRandomTicketNumber } from "@/lib/ticketNumber";

// แสดงเลขที่ "ถ้าจะออกใบตอนนี้" ไว้ดูใน JSON Preview เท่านั้น อ่านอย่างเดียว ไม่หักตัวนับจริง
// (ตัวนับจริง/การกันซ้ำจริงจะถูกทำแบบ atomic ตอนกด submit ใน /api/tickets แทน)
export async function GET(request: NextRequest) {
  const marketCodes = Array.from(new Set(request.nextUrl.searchParams.getAll("MarketCode").filter(Boolean)));
  const redis = getRedisClient();

  try {
    const ticketNumber = previewRandomTicketNumber();
    const ticketNoByMarket: Record<string, string> = {};
    for (const marketCode of marketCodes) {
      ticketNoByMarket[marketCode] = await peekNextTicketNo(redis, marketCode);
    }
    return NextResponse.json({ ticketNumber, ticketNoByMarket });
  } catch (error) {
    console.error("Failed to read ticket number preview", error);
    return NextResponse.json({ message: "Failed to read ticket number preview" }, { status: 502 });
  }
}
