import type { TicketPayload } from "@/types/gate";
import type { BoothFormState } from "@/types/gateForm";

export function buildTicketPayload(
  marketCode: string,
  booths: BoothFormState[],
  ticketNumber: string,
): TicketPayload {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const ticketCreatedAt = now.toISOString().slice(0, 19) + "+07:00";

  return {
    TicketNumber: ticketNumber,
    TicketNo: ticketNumber,
    TicketCreatedAt: ticketCreatedAt,
    BoothCount: booths.length,
    MarketCode: marketCode,
    DropoffPoint: "Gate 1 - Zone A",
    LicensePlate: "กก 99",
    LicensePlateProvince: "กรุงเทพ",
    VehicleTypeCode: "PICKUP",
    VehicleTypeName: "Pickup truck",
    Booths: booths.map((booth) => ({
      BoothCode: booth.boothCode,
      Products: booth.items.map((item) => ({
        ProductCode: item.productCode,
        PackageCode: item.packageCode,
        Quantity: Number(item.quantity) || 0,
      })),
    })),
    Dispatch: true,
  };
}

export function validateBooths(marketCode: string, booths: BoothFormState[]): string | null {
  if (!marketCode) return "กรุณาเลือกตลาด";

  for (const booth of booths) {
    if (!booth.boothCode) return "กรุณาเลือกรหัสแผงให้ครบทุกแผง";

    for (const item of booth.items) {
      if (!item.productCode) return "กรุณาเลือกสินค้าให้ครบทุกรายการ";
      if (!item.packageCode) return "กรุณาเลือกแพ็กเกจให้ครบทุกรายการ";
      if (!item.quantity || Number(item.quantity) < 1) {
        return "กรุณาระบุจำนวนให้ครบทุกรายการ (อย่างน้อย 1 ชิ้น)";
      }
    }
  }

  return null;
}
