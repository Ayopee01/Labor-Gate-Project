import { NextRequest, NextResponse } from "next/server";
import { claimTicketNo, claimUniqueTicketNumber, getRedisClient } from "@/lib/ticketNumber";
import type { TicketBatchRequest, TicketPayload, TicketResult } from "@/types/gate";

export async function POST(request: NextRequest) {
  const baseUrl = process.env.GATE_BASE_URL;
  const clientId = process.env.GATE_CLIENT_ID;
  const clientSecret = process.env.GATE_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error("Missing required env var: GATE_BASE_URL, GATE_CLIENT_ID or GATE_CLIENT_SECRET");
  }

  const body = (await request.json()) as TicketBatchRequest;

  if (!body.Markets || body.Markets.length === 0) {
    return NextResponse.json({ message: "ต้องมีอย่างน้อย 1 ตลาด" }, { status: 400 });
  }

  const redis = getRedisClient();
  const url = new URL("/api/gate/tickets", baseUrl);
  const authHeader = "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const ticketCreatedAt = now.toISOString().slice(0, 19) + "+07:00";

  // TicketNumber (เลขที่บิล) สุ่ม 14 หลัก ใช้ตัวเดียวร่วมกันทุกตลาดในการยิงครั้งนี้ — ทั้ง TicketNumber
  // และ TicketNo ที่ client ส่งมาเป็นแค่ค่า preview เท่านั้น เลขจริงถูกกำหนดที่นี่เสมอ กันเลขซ้ำ/เลขชน
  // เวลามีคนกดพร้อมกันจากหลายเครื่อง
  const ticketNumber = await claimUniqueTicketNumber(redis);
  const results: TicketResult[] = [];

  try {
    for (const market of body.Markets) {
      // TicketNo อิงตามตลาดเสมอ (นับแยกเป็นตัวนับต่อตลาด) — 1 ตลาดมีได้หลายแผงแต่ได้ TicketNo เดียว
      const ticketNo = await claimTicketNo(redis, market.MarketCode);

      const payload: TicketPayload = {
        TicketNumber: ticketNumber,
        TicketNo: ticketNo,
        TicketCreatedAt: ticketCreatedAt,
        BoothCount: market.Booths.length,
        MarketCode: market.MarketCode,
        DropoffPoint: body.DropoffPoint,
        LicensePlate: body.LicensePlate,
        LicensePlateProvince: body.LicensePlateProvince,
        VehicleTypeCode: body.VehicleTypeCode,
        VehicleTypeName: body.VehicleTypeName,
        Booths: market.Booths,
        Dispatch: body.Dispatch,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Gate ticket request failed for market ${market.MarketCode}: ${res.status} ${text}`);
      }

      results.push(text ? JSON.parse(text) : {});
    }

    return NextResponse.json({ TicketNumber: ticketNumber, Results: results });
  } catch (error) {
    console.error("Failed to create gate ticket batch", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    // ส่ง Results ที่สำเร็จไปแล้วกลับไปด้วย เผื่อบางตลาดออกใบสำเร็จก่อนตลาดที่พังจะได้ไม่หายไปเฉย ๆ
    return NextResponse.json({ message, TicketNumber: ticketNumber, Results: results }, { status: 502 });
  }
}
