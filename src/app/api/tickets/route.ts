import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import type { TicketPayload } from "@/types/gate";

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

// หักตัวนับแบบ atomic (Redis INCR) ตรงนี้เท่านั้น เพื่อกันเลขที่ใบซ้ำกันเวลามีหลายเครื่อง/หลาย
// browser ยิงเข้ามาพร้อมกัน — เลขที่ client ส่งมาใน payload เป็นแค่ค่า preview เท่านั้น เลขจริงถูก
// กำหนดที่นี่แล้ว override ทับก่อนส่งต่อไป backend เสมอ
async function claimTicketNumber(): Promise<string> {
  const redisUrl = process.env.UPSTASH_REDIS_KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error("Missing required env var: UPSTASH_REDIS_KV_REST_API_URL or UPSTASH_REDIS_KV_REST_API_TOKEN");
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });
  const dateStr = getBangkokDateStr();
  const key = `ticket-counter:${dateStr}`;
  const seq = await redis.incr(key);
  await redis.expire(key, 60 * 60 * 48);
  return `${dateStr}${String(seq).padStart(6, "0")}`;
}

export async function POST(request: NextRequest) {
  const baseUrl = process.env.GATE_BASE_URL;
  const clientId = process.env.GATE_CLIENT_ID;
  const clientSecret = process.env.GATE_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error("Missing required env var: GATE_BASE_URL, GATE_CLIENT_ID or GATE_CLIENT_SECRET");
  }

  const payload = (await request.json()) as TicketPayload;

  const ticketNumber = await claimTicketNumber();
  payload.TicketNumber = ticketNumber;
  payload.TicketNo = ticketNumber;

  const url = new URL("/api/gate/tickets", baseUrl);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Gate ticket request failed: ${res.status} ${text}`);
    }

    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to create gate ticket", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message }, { status: 502 });
  }
}
