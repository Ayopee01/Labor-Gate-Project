import { NextRequest } from "next/server";
import { gateFetch, proxyError, toNextResponse } from "@/lib/gateClient";
import { GATE_NO, TICKET_NO_PATTERN } from "@/lib/gateConstants";
import type { GateTicketUpdateRequest, TicketUpdateDraft } from "@/types/gate";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/tickets/[ticketNo]">) {
  const { ticketNo } = await ctx.params;
  if (!TICKET_NO_PATTERN.test(ticketNo)) {
    return proxyError(400, "INVALID_TICKET_NO", "ticketNo ต้องเป็นตัวเลข 14 หลัก");
  }

  return toNextResponse(await gateFetch(`/api/gate/tickets/${ticketNo}`));
}

// ส่ง "สภาพสุดท้าย" ของตั๋วทั้งใบ backend เทียบกับของเดิมเอง — GateNo ใช้บันทึก log ว่าแก้จากช่องไหน
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/tickets/[ticketNo]">) {
  const { ticketNo } = await ctx.params;
  if (!TICKET_NO_PATTERN.test(ticketNo)) {
    return proxyError(400, "INVALID_TICKET_NO", "ticketNo ต้องเป็นตัวเลข 14 หลัก");
  }

  const body = (await request.json()) as TicketUpdateDraft;
  const payload: GateTicketUpdateRequest = {
    GateNo: GATE_NO,
    Version: body.Version,
    MarketCode: body.MarketCode,
    DropoffPoint: body.DropoffPoint,
    Booths: body.Booths,
  };

  const result = await gateFetch(`/api/gate/tickets/${ticketNo}`, { method: "PUT", body: payload });
  if (result.status >= 400) {
    console.error("Gate ticket update failed", ticketNo, result.status, JSON.stringify(result.body));
  }
  return toNextResponse(result);
}
