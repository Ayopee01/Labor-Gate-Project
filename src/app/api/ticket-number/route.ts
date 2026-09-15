import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// รูปแบบ: YYYYMMDD (ตามเวลาไทย) + เลขรัน 6 หลัก เริ่มที่ 000001 เป็นใบแรกของวันนั้น
function getBangkokDateStr(): string {
  const now = new Date();
  const bkkMs = now.getTime() + 7 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000;
  const bkk = new Date(bkkMs);
  const y = bkk.getFullYear();
  const m = String(bkk.getMonth() + 1).padStart(2, "0");
  const d = String(bkk.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// แสดงเลขที่ "ถ้าจะออกใบตอนนี้" ไว้ดูใน JSON Preview เท่านั้น อ่านอย่างเดียว ไม่หักตัวนับจริง
// (ตัวนับจริงจะถูกหักแบบ atomic ตอนกด submit ใน /api/tickets แทน)
export async function GET() {
  const redisUrl = process.env.UPSTASH_REDIS_KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error("Missing required env var: UPSTASH_REDIS_KV_REST_API_URL or UPSTASH_REDIS_KV_REST_API_TOKEN");
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });
  const dateStr = getBangkokDateStr();
  const key = `ticket-counter:${dateStr}`;

  try {
    const current = (await redis.get<number>(key)) ?? 0;
    const ticketNumber = `${dateStr}${String(current + 1).padStart(6, "0")}`;
    return NextResponse.json({ ticketNumber });
  } catch (error) {
    console.error("Failed to read ticket number preview", error);
    return NextResponse.json({ message: "Failed to read ticket number preview" }, { status: 502 });
  }
}
