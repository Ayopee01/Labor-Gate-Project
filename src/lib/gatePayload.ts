import { GATE_NO, TEST_VEHICLE, TICKET_NO_PATTERN } from "@/lib/gateConstants";
import type {
  GateTicketDetailResponse,
  TicketBoothPayload,
  TicketCreateDraft,
  TicketDraftMarket,
  TicketUpdateDraft,
} from "@/types/gate";
import type { BoothFormState, MarketGroupFormState } from "@/types/gateForm";

function toBoothPayloads(booths: BoothFormState[]): TicketBoothPayload[] {
  return booths.map((booth) => ({
    BoothCode: booth.boothCode,
    Products: booth.items.map((item) => ({
      ProductCode: item.productCode,
      PackageCode: item.packageCode,
      Quantity: Number(item.quantity) || 0,
    })),
  }));
}

export function buildDraftMarkets(marketGroups: MarketGroupFormState[]): TicketDraftMarket[] {
  return marketGroups.map((group) => ({
    MarketCode: group.marketCode,
    DropoffPoint: group.dropoffPoint.trim(),
    Booths: toBoothPayloads(group.booths),
  }));
}

export function buildTicketCreateDraft(
  marketGroups: MarketGroupFormState[],
  idempotencyKey: string,
  existingTicketNumber?: string,
): TicketCreateDraft {
  return {
    ...(existingTicketNumber ? { TicketNumber: existingTicketNumber } : {}),
    IdempotencyKey: idempotencyKey,
    ...TEST_VEHICLE,
    Markets: buildDraftMarkets(marketGroups),
    Dispatch: true,
  };
}

// รูปแบบเดียวกับที่ /api/tickets จะส่งไป backend จริง ไว้โชว์ใน JSON Preview เท่านั้น — TicketNumber/TicketNo
// ที่ preview เป็นแค่ตัวอย่าง ค่าจริงถูก claim ที่ /api/tickets ตอนกดส่ง (TicketNo เป็นตัวนับกลางรวมทุกตลาด
// จึงอิงตาม "ลำดับ" ของตลาดในบิลนี้ previewTicketNoList[i] คู่กับ marketGroups[i])
export function buildPreviewPayload(
  marketGroups: MarketGroupFormState[],
  previewTicketNumber: string,
  previewTicketNoList: string[],
  existingTicketNumber?: string,
) {
  return {
    TicketNumber: existingTicketNumber || previewTicketNumber,
    GateNo: GATE_NO,
    ...TEST_VEHICLE,
    Markets: buildDraftMarkets(marketGroups).map((market, index) => ({
      TicketNo: previewTicketNoList[index] ?? "",
      TicketCreatedAt: "<กำหนดตอนกดส่ง>",
      ...market,
    })),
    Dispatch: true,
    IdempotencyKey: "<สร้างตอนกดส่ง>",
  };
}

export function buildTicketUpdateDraft(group: MarketGroupFormState, version: string): TicketUpdateDraft {
  return {
    Version: version,
    MarketCode: group.marketCode,
    DropoffPoint: group.dropoffPoint.trim(),
    Booths: toBoothPayloads(group.booths),
  };
}

// แปลงตั๋วจาก GET /api/gate/tickets/{ticketNo} เป็น state ของฟอร์ม เพื่อเปิดหน้าแก้ไข
export function detailToMarketGroup(detail: GateTicketDetailResponse): MarketGroupFormState {
  const market = detail.Market;
  return {
    id: `edit-${market.TicketNo}`,
    marketCode: market.MarketCode,
    dropoffPoint: market.DropoffPoint ?? "",
    booths: market.Booths.map((booth, bi) => ({
      id: `edit-${market.TicketNo}-booth-${bi}`,
      boothCode: booth.BoothCode,
      locked: !booth.Editable,
      lockReason: booth.LockReason,
      status: booth.Status,
      items: booth.Products.map((p, pi) => ({
        id: `edit-${market.TicketNo}-booth-${bi}-item-${pi}`,
        productCode: p.ProductCode,
        packageCode: p.PackageCode,
        quantity: String(p.Quantity),
      })),
    })),
  };
}

export function validateTicketNumber(value: string): string | null {
  return TICKET_NO_PATTERN.test(value) ? null : "เลขที่บิล (TicketNumber) ต้องเป็นตัวเลข 14 หลัก";
}

// กฎเดียวกับ validation ของ backend (ข้อ 2.3 ใน docsgate.md) เพื่อจับข้อผิดพลาดก่อนส่งจริง
export function validateMarketGroups(groups: MarketGroupFormState[]): string | null {
  if (groups.length === 0) return "กรุณาเพิ่มอย่างน้อย 1 ตลาด";

  const seenMarkets = new Set<string>();
  for (const group of groups) {
    if (!group.marketCode) return "กรุณาเลือกตลาดให้ครบทุกตลาด";
    if (seenMarkets.has(group.marketCode)) return "เลือกตลาดซ้ำกันในบิลเดียวกันไม่ได้";
    seenMarkets.add(group.marketCode);

    if (!group.dropoffPoint.trim()) return "กรุณาระบุจุดจอดส่งสินค้าให้ครบทุกตลาด";
    if (group.booths.length === 0) return "กรุณาเพิ่มอย่างน้อย 1 แผงในแต่ละตลาด";

    const seenBooths = new Set<string>();
    for (const booth of group.booths) {
      if (!booth.boothCode) return "กรุณาเลือกรหัสแผงให้ครบทุกแผง";
      if (seenBooths.has(booth.boothCode)) return `แผง ${booth.boothCode} ซ้ำกันในตลาดเดียวกันไม่ได้`;
      seenBooths.add(booth.boothCode);

      if (booth.items.length === 0) return `กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการในแผง ${booth.boothCode}`;

      const seenItems = new Set<string>();
      for (const item of booth.items) {
        if (!item.productCode) return "กรุณาเลือกสินค้าให้ครบทุกรายการ";
        if (!item.packageCode) return "กรุณาเลือกแพ็กเกจให้ครบทุกรายการ";
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
          return "กรุณาระบุจำนวนเป็นจำนวนเต็มให้ครบทุกรายการ (อย่างน้อย 1 ชิ้น)";
        }
        const itemKey = `${item.productCode}|${item.packageCode}`;
        if (seenItems.has(itemKey)) return `แผง ${booth.boothCode} มีสินค้าและแพ็กเกจเดียวกันซ้ำกัน`;
        seenItems.add(itemKey);
      }
    }
  }

  return null;
}
