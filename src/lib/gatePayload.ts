import type { TicketBatchRequest } from "@/types/gate";
import type { MarketGroupFormState } from "@/types/gateForm";

export function buildTicketBatchRequest(marketGroups: MarketGroupFormState[]): TicketBatchRequest {
  return {
    Markets: marketGroups.map((group) => ({
      MarketCode: group.marketCode,
      Booths: group.booths.map((booth) => ({
        BoothCode: booth.boothCode,
        Products: booth.items.map((item) => ({
          ProductCode: item.productCode,
          PackageCode: item.packageCode,
          Quantity: Number(item.quantity) || 0,
        })),
      })),
    })),
    DropoffPoint: "Gate 1 - Zone A",
    LicensePlate: "กก 99",
    LicensePlateProvince: "กรุงเทพ",
    VehicleTypeCode: "PICKUP",
    VehicleTypeName: "Pickup truck",
    Dispatch: true,
  };
}

// ต่อ TicketNumber/TicketNo แบบ preview เข้ากับ request จริง ไว้โชว์ใน JSON Preview เท่านั้น —
// ค่าจริงถูกกำหนดที่ /api/tickets เสมอ ไม่ได้อิงจากค่าที่ preview ตรงนี้ — TicketNo เป็นตัวนับกลาง
// ตัวเดียวรวมทุกตลาด จึงต้องอิงตาม "ลำดับ" ของตลาดในบิลนี้ (previewTicketNoList[i] คู่กับ marketGroups[i])
export function buildPreviewPayload(
  marketGroups: MarketGroupFormState[],
  previewTicketNumber: string,
  previewTicketNoList: string[],
) {
  const batch = buildTicketBatchRequest(marketGroups);
  return {
    TicketNumber: previewTicketNumber,
    ...batch,
    Markets: batch.Markets.map((market, index) => ({
      TicketNo: previewTicketNoList[index] ?? "",
      ...market,
    })),
  };
}

export function validateMarketGroups(groups: MarketGroupFormState[]): string | null {
  if (groups.length === 0) return "กรุณาเพิ่มอย่างน้อย 1 ตลาด";

  const seenMarkets = new Set<string>();
  for (const group of groups) {
    if (!group.marketCode) return "กรุณาเลือกตลาดให้ครบทุกตลาด";
    if (seenMarkets.has(group.marketCode)) return "เลือกตลาดซ้ำกันในบิลเดียวกันไม่ได้";
    seenMarkets.add(group.marketCode);

    if (group.booths.length === 0) return "กรุณาเพิ่มอย่างน้อย 1 แผงในแต่ละตลาด";

    for (const booth of group.booths) {
      if (!booth.boothCode) return "กรุณาเลือกรหัสแผงให้ครบทุกแผง";

      for (const item of booth.items) {
        if (!item.productCode) return "กรุณาเลือกสินค้าให้ครบทุกรายการ";
        if (!item.packageCode) return "กรุณาเลือกแพ็กเกจให้ครบทุกรายการ";
        if (!item.quantity || Number(item.quantity) < 1) {
          return "กรุณาระบุจำนวนให้ครบทุกรายการ (อย่างน้อย 1 ชิ้น)";
        }
      }
    }
  }

  return null;
}
