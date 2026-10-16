import { DEFAULT_DROPOFF_POINT } from "@/lib/gateConstants";

export interface ItemFormState {
  id: string;
  productCode: string;
  packageCode: string;
  quantity: string;
}

export interface BoothFormState {
  id: string;
  boothCode: string;
  items: ItemFormState[];
  // ใช้ตอนแก้ไขตั๋วเท่านั้น: แผงที่ Editable: false ต้องส่งกลับไปเหมือนเดิมทุกอย่าง ห้ามแก้/ลบ
  locked?: boolean;
  lockReason?: string | null;
  status?: string;
}

export function createEmptyItem(id?: string): ItemFormState {
  return { id: id ?? crypto.randomUUID(), productCode: "", packageCode: "", quantity: "" };
}

export function createEmptyBooth(id?: string): BoothFormState {
  return {
    id: id ?? crypto.randomUUID(),
    boothCode: "",
    items: [createEmptyItem(id ? `${id}-item-1` : undefined)],
  };
}

export interface MarketGroupFormState {
  id: string;
  marketCode: string;
  dropoffPoint: string;
  booths: BoothFormState[];
}

export function createEmptyMarketGroup(id?: string): MarketGroupFormState {
  return {
    id: id ?? crypto.randomUUID(),
    marketCode: "",
    dropoffPoint: DEFAULT_DROPOFF_POINT,
    booths: [createEmptyBooth(id ? `${id}-booth-1` : undefined)],
  };
}
