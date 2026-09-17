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
  booths: BoothFormState[];
}

export function createEmptyMarketGroup(id?: string): MarketGroupFormState {
  return {
    id: id ?? crypto.randomUUID(),
    marketCode: "",
    booths: [createEmptyBooth(id ? `${id}-booth-1` : undefined)],
  };
}
