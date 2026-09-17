import crypto from "crypto";
import { Redis } from "@upstash/redis";

const TICKET_NUMBER_LENGTH = 14;
// กันไม่ให้คีย์ที่กันซ้ำสะสมไม่มีที่สิ้นสุด แต่ก็อยู่นานพอที่โอกาสสุ่มชนซ้ำในทางปฏิบัติแทบเป็นศูนย์
const USED_TICKET_NUMBER_TTL_SECONDS = 60 * 60 * 24 * 730;

export function getRedisClient(): Redis {
  const redisUrl = process.env.UPSTASH_REDIS_KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error("Missing required env var: UPSTASH_REDIS_KV_REST_API_URL or UPSTASH_REDIS_KV_REST_API_TOKEN");
  }

  return new Redis({ url: redisUrl, token: redisToken });
}

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

function randomTicketNumber(): string {
  let digits = "";
  for (let i = 0; i < TICKET_NUMBER_LENGTH; i++) {
    digits += crypto.randomInt(0, 10).toString();
  }
  return digits;
}

// เลขที่บิล (TicketNumber) สุ่ม 14 หลัก ใช้ตัวเดียวร่วมกันได้หลายตลาดในบิลเดียวกัน
// Gate backend ปลายทางไม่ validate ความไม่ซ้ำให้ ต้องกันเองที่นี่ด้วย Redis SETNX
export async function claimUniqueTicketNumber(redis: Redis): Promise<string> {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = randomTicketNumber();
    const reserved = await redis.set(`ticket-number:used:${candidate}`, 1, {
      nx: true,
      ex: USED_TICKET_NUMBER_TTL_SECONDS,
    });
    if (reserved) return candidate;
  }
  throw new Error("Failed to generate a unique TicketNumber after multiple attempts");
}

// ไว้โชว์ preview เท่านั้น ไม่ผูกกับของจริง (ของจริงกันซ้ำตอน claim เท่านั้น)
export function previewRandomTicketNumber(): string {
  return randomTicketNumber();
}

function ticketNoCounterKey(): string {
  return `ticket-no-counter:${getBangkokDateStr()}`;
}

// ดูเลขที่ "ถ้าจะออกใบตอนนี้" เฉย ๆ ไว้โชว์ preview อ่านอย่างเดียว ไม่หักตัวนับจริง — คืนมาเป็น
// array ต่อเนื่องกัน `count` ตัว (เท่ากับจำนวนตลาดที่กำลังจะยิงพร้อมกันในบิลเดียว) เพราะ TicketNo
// เป็นตัวนับกลางตัวเดียวรวมทุกตลาด (ไม่แยกตามตลาด) เวลา submit จริงจะไล่ claim ทีละตลาดตามลำดับ
export async function peekNextTicketNos(redis: Redis, count: number): Promise<string[]> {
  const dateStr = getBangkokDateStr();
  const current = (await redis.get<number>(ticketNoCounterKey())) ?? 0;
  return Array.from({ length: count }, (_, i) => `${dateStr}${String(current + i + 1).padStart(6, "0")}`);
}

// หักตัวนับแบบ atomic (Redis INCR) เป็นตัวนับกลางตัวเดียวรวมทุกตลาดในแต่ละวัน — ทุกใบที่ออกจริง
// (ไม่ว่าจะตลาดไหน) ได้เลขถัดไปเสมอ ไม่มีการรีเซ็ตตามตลาด
export async function claimTicketNo(redis: Redis): Promise<string> {
  const dateStr = getBangkokDateStr();
  const key = ticketNoCounterKey();
  const seq = await redis.incr(key);
  await redis.expire(key, 60 * 60 * 48);
  return `${dateStr}${String(seq).padStart(6, "0")}`;
}
