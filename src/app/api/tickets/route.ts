import { NextRequest } from "next/server";
import { gateErrorCode, gateFetch, proxyError, toNextResponse, type GateFetchResult } from "@/lib/gateClient";
import { GATE_NO, TICKET_NO_PATTERN } from "@/lib/gateConstants";
import { claimTicketsForRequest, getRedisClient, type TicketClaim } from "@/lib/ticketNumber";
import type { GateTicketRequest, TicketCreateDraft } from "@/types/gate";

const NOT_READY_RETRIES = 3;
const NOT_READY_DELAY_MS = 1000;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as TicketCreateDraft;

  if (!body.Markets || body.Markets.length === 0) {
    return proxyError(400, "VALIDATION_ERROR", "ต้องมีอย่างน้อย 1 ตลาด");
  }
  if (!body.IdempotencyKey) {
    return proxyError(400, "VALIDATION_ERROR", "ต้องส่ง IdempotencyKey");
  }
  if (body.TicketNumber && !TICKET_NO_PATTERN.test(body.TicketNumber)) {
    return proxyError(400, "VALIDATION_ERROR", "TicketNumber ต้องเป็นตัวเลข 14 หลัก");
  }

  // TicketNumber (สุ่ม) และ TicketNo (ตัวนับกลางตัวเดียวรวมทุกตลาด) ถูก claim ครบทุกตลาดก่อนยิง
  // และผูกไว้กับ IdempotencyKey — retry ด้วย key เดิมจะได้เลขชุดเดิม backend จึง replay ให้ ไม่ออกตั๋วซ้ำ
  let claim: TicketClaim;
  try {
    claim = await claimTicketsForRequest(getRedisClient(), body.IdempotencyKey, body.Markets.length, body.TicketNumber);
  } catch (error) {
    console.error("Failed to claim ticket numbers", error);
    return proxyError(502, "TICKET_NO_CLAIM_FAILED", error instanceof Error ? error.message : "Failed to claim ticket numbers");
  }

  const payload: GateTicketRequest = {
    TicketNumber: claim.TicketNumber,
    GateNo: GATE_NO,
    LicensePlate: body.LicensePlate,
    LicensePlateProvince: body.LicensePlateProvince,
    VehicleTypeCode: body.VehicleTypeCode,
    VehicleTypeName: body.VehicleTypeName,
    Markets: body.Markets.map((market, index) => ({
      TicketNo: claim.TicketNos[index],
      TicketCreatedAt: claim.TicketCreatedAt,
      MarketCode: market.MarketCode,
      DropoffPoint: market.DropoffPoint,
      Booths: market.Booths,
    })),
    Dispatch: body.Dispatch,
    IdempotencyKey: body.IdempotencyKey,
  };

  // backend ทำทั้ง request ใน transaction เดียว — สำเร็จทั้งหมดหรือไม่บันทึกเลย จึงส่งผลกลับไปตรง ๆ
  let result: GateFetchResult = await gateFetch("/api/gate/tickets", { method: "POST", body: payload });
  for (let attempt = 0; attempt < NOT_READY_RETRIES && gateErrorCode(result) === "GATE_REQUEST_RESPONSE_NOT_READY"; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, NOT_READY_DELAY_MS));
    result = await gateFetch("/api/gate/tickets", { method: "POST", body: payload });
  }

  if (result.status >= 400) {
    console.error("Gate ticket request failed", result.status, JSON.stringify(result.body));
  }
  return toNextResponse(result);
}
