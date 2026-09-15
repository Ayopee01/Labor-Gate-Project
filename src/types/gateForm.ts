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
