import { NextRequest, NextResponse } from "next/server";
import { getRedisClient, peekNextTicketNos, previewRandomTicketNumber } from "@/lib/ticketNumber";

// แสดงเลขที่ "ถ้าจะออกใบตอนนี้" ไว้ดูใน JSON Preview เท่านั้น อ่านอย่างเดียว ไม่หักตัวนับจริง
// (ตัวนับจริง/การกันซ้ำจริงจะถูกทำแบบ atomic ตอนกด submit ใน /api/tickets แทน)
export async function GET(request: NextRequest) {
  const countParam = Number(request.nextUrl.searchParams.get("count"));
  const count = Number.isFinite(countParam) && countParam > 0 ? Math.floor(countParam) : 1;
  const redis = getRedisClient();

  try {
    const ticketNumber = previewRandomTicketNumber();
    const ticketNoPreview = await peekNextTicketNos(redis, count);
    return NextResponse.json({ ticketNumber, ticketNoPreview });
  } catch (error) {
    console.error("Failed to read ticket number preview", error);
    return NextResponse.json({ message: "Failed to read ticket number preview" }, { status: 502 });
  }
}
