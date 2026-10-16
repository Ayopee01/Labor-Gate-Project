"use client";

import Select, { type SingleValue } from "react-select";
import type { GateOption } from "@/hooks/useGateOptions";
import type { GateProduct } from "@/types/gate";
import {
  createEmptyBooth,
  createEmptyItem,
  type BoothFormState,
  type ItemFormState,
  type MarketGroupFormState,
} from "@/types/gateForm";

export function GateSelect({
  options,
  value,
  onChange,
  placeholder,
  isLoading,
  isDisabled,
  instanceId,
}: {
  options: GateOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  instanceId: string;
}) {
  // ตอนเปิดตั๋วเดิมมาแก้ไข ค่าอาจไม่อยู่ใน options แล้ว (เช่นแผงถูกปิดใช้งาน) ให้ยังเห็นค่าเดิมอยู่
  const selected = options.find((opt) => opt.value === value) ?? (value ? { value, label: value } : null);

  return (
    <Select<GateOption>
      instanceId={instanceId}
      unstyled
      options={options}
      value={selected}
      isLoading={isLoading}
      isDisabled={isDisabled}
      placeholder={placeholder}
      noOptionsMessage={() => "ไม่พบตัวเลือก"}
      loadingMessage={() => "กำลังโหลด..."}
      onChange={(opt: SingleValue<GateOption>) => onChange(opt?.value ?? "")}
      classNames={{
        control: ({ isFocused, isDisabled: disabled }) =>
          `!min-h-0 rounded-xl border-2 px-3 py-2 text-lg transition ${
            disabled ? "bg-[#edf2f7] opacity-80" : "bg-[#f7fafc]"
          } ${
            isFocused
              ? "!border-primary !bg-white shadow-[0_0_0_4px_rgba(211,47,47,0.1)]"
              : "border-border"
          }`,
        placeholder: () => "text-text-light",
        singleValue: () => "text-text-dark",
        input: () => "text-text-dark",
        menu: () => "z-20 mt-2 rounded-xl border-2 border-border bg-white shadow-lg",
        menuList: () => "py-1",
        option: ({ isFocused, isSelected }) =>
          `cursor-pointer px-4 py-3 text-lg ${
            isSelected
              ? "bg-primary text-white"
              : isFocused
                ? "bg-primary-light text-text-dark"
                : "text-text-dark"
          }`,
        indicatorSeparator: () => "hidden",
        dropdownIndicator: () => "text-text-gray px-2",
        clearIndicator: () => "text-text-gray px-2",
      }}
    />
  );
}

function productOptions(products: GateProduct[]): GateOption[] {
  return products.map((p) => {
    const value = p.ProductCode || p.ProductName || "";
    return { value, label: p.ProductName || value };
  });
}

function packageOptions(products: GateProduct[], productCode: string): GateOption[] {
  const product = products.find((p) => (p.ProductCode || p.ProductName) === productCode);
  if (!product?.Packages?.length) return [];
  return product.Packages.map((pkg) => {
    const value = pkg.PackageCode || pkg.PackageName || "";
    return { value, label: pkg.PackageName || value };
  });
}

const BOOTH_STATUS_LABELS: Record<string, string> = {
  WAIT: "รอดำเนินการ",
  WORKING: "กำลังทำงาน",
  DELIVERED: "ส่งยอดแล้ว",
  REJECT: "ถูกปฏิเสธ",
  COMPLETED: "เสร็จสิ้น",
};

const LOCK_REASON_LABELS: Record<string, string> = {
  BOOTH_ALREADY_SUBMITTED: "ส่งยอดแล้ว แก้ไข/ลบไม่ได้",
  TICKET_ALREADY_SUBMITTED: "ส่งยอดแล้ว แก้ไข/ลบไม่ได้",
  BOOTH_ALREADY_CLOSED: "ปิดแผงแล้ว แก้ไข/ลบไม่ได้",
};

function ItemCard({
  item,
  index,
  products,
  canRemove,
  disabled,
  onChange,
  onRemove,
}: {
  item: ItemFormState;
  index: number;
  products: GateProduct[];
  canRemove: boolean;
  disabled: boolean;
  onChange: (patch: Partial<ItemFormState>) => void;
  onRemove: () => void;
}) {
  const packages = packageOptions(products, item.productCode);

  return (
    <div className="gate-item-card">
      <div className="gate-item-header">
        <span>
          รายการที่ <span>{index + 1}</span>
        </span>
        {canRemove && !disabled && (
          <button type="button" className="gate-remove-btn" tabIndex={-1} onClick={onRemove}>
            ลบรายการ
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
        <div>
          <label className="gate-field-label">เลือกสินค้า</label>
          <GateSelect
            instanceId={`product-${item.id}`}
            options={productOptions(products)}
            value={item.productCode}
            placeholder="-- เลือกสินค้า --"
            isDisabled={disabled}
            onChange={(productCode) => onChange({ productCode, packageCode: "" })}
          />
        </div>

        <div>
          <label className="gate-field-label">เลือกแพ็กเกจ</label>
          <GateSelect
            instanceId={`package-${item.id}`}
            options={packages}
            value={item.packageCode}
            placeholder={item.productCode ? "-- เลือกแพ็กเกจ --" : "-- โปรดเลือกสินค้าก่อน --"}
            isDisabled={disabled || !item.productCode}
            onChange={(packageCode) => onChange({ packageCode })}
          />
        </div>

        <div className="col-span-2 max-[480px]:col-span-1">
          <label className="gate-field-label">จำนวน (ชิ้น)</label>
          <input
            className="gate-input disabled:bg-[#edf2f7] disabled:opacity-80"
            type="number"
            min={1}
            step={1}
            placeholder="ระบุจำนวน"
            required
            disabled={disabled}
            value={item.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function BoothGroupCard({
  booth,
  index,
  products,
  boothOptions,
  boothOptionsLoading,
  boothOptionsPlaceholder,
  canRemove,
  highlighted,
  onChange,
  onRemove,
}: {
  booth: BoothFormState;
  index: number;
  products: GateProduct[];
  boothOptions: GateOption[];
  boothOptionsLoading: boolean;
  boothOptionsPlaceholder: string;
  canRemove: boolean;
  highlighted: boolean;
  onChange: (patch: Partial<BoothFormState>) => void;
  onRemove: () => void;
}) {
  const locked = Boolean(booth.locked);

  function updateItem(itemId: string, patch: Partial<ItemFormState>) {
    onChange({
      items: booth.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    });
  }

  function removeItem(itemId: string) {
    onChange({ items: booth.items.filter((it) => it.id !== itemId) });
  }

  function addItem() {
    onChange({ items: [...booth.items, createEmptyItem()] });
  }

  return (
    <div className={`gate-booth-group ${highlighted ? "!border-primary ring-4 ring-primary/20" : ""}`}>
      <div className="gate-booth-group-header">
        <span className="flex flex-wrap items-center gap-2">
          <span>
            แผงที่ <span>{index + 1}</span>
          </span>
          {booth.status && (
            <span className="rounded-md bg-[#edf2f7] px-2 py-0.5 text-sm font-medium text-text-gray">
              {BOOTH_STATUS_LABELS[booth.status] ?? booth.status}
            </span>
          )}
          {locked && (
            <span className="rounded-md bg-primary-light px-2 py-0.5 text-sm font-medium text-primary">
              🔒 {(booth.lockReason && LOCK_REASON_LABELS[booth.lockReason]) ?? "แก้ไขไม่ได้"}
            </span>
          )}
        </span>
        {canRemove && !locked && (
          <button type="button" className="gate-remove-btn" tabIndex={-1} onClick={onRemove}>
            ลบแผง
          </button>
        )}
      </div>

      <div className="mb-4">
        <label className="gate-field-label">รหัสแผง (Booth Code)</label>
        <GateSelect
          instanceId={`booth-${booth.id}`}
          options={boothOptions}
          value={booth.boothCode}
          placeholder={boothOptionsPlaceholder}
          isLoading={boothOptionsLoading}
          isDisabled={locked || boothOptions.length === 0}
          onChange={(boothCode) => onChange({ boothCode })}
        />
      </div>

      <div className="flex flex-col gap-5">
        {booth.items.map((item, itemIndex) => (
          <ItemCard
            key={item.id}
            item={item}
            index={itemIndex}
            products={products}
            canRemove={booth.items.length > 1}
            disabled={locked}
            onChange={(patch) => updateItem(item.id, patch)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>

      {!locked && (
        <button type="button" className="gate-add-btn" onClick={addItem}>
          + เพิ่มสินค้าอีกชนิด
        </button>
      )}
    </div>
  );
}

export function MarketGroupCard({
  group,
  title,
  products,
  marketOptions,
  marketOptionsLoading,
  marketPlaceholder,
  marketLocked,
  boothOptions,
  boothOptionsLoading,
  boothOptionsPlaceholder,
  highlightedBoothCodes,
  canRemove,
  onChange,
  onRemove,
}: {
  group: MarketGroupFormState;
  title: string;
  products: GateProduct[];
  marketOptions: GateOption[];
  marketOptionsLoading: boolean;
  marketPlaceholder: string;
  marketLocked?: boolean;
  boothOptions: GateOption[];
  boothOptionsLoading: boolean;
  boothOptionsPlaceholder: string;
  highlightedBoothCodes?: string[];
  canRemove: boolean;
  onChange: (patch: Partial<MarketGroupFormState>) => void;
  onRemove?: () => void;
}) {
  function updateBooth(boothId: string, patch: Partial<BoothFormState>) {
    onChange({ booths: group.booths.map((b) => (b.id === boothId ? { ...b, ...patch } : b)) });
  }

  function removeBooth(boothId: string) {
    onChange({ booths: group.booths.filter((b) => b.id !== boothId) });
  }

  function addBooth() {
    onChange({ booths: [...group.booths, createEmptyBooth()] });
  }

  function changeMarket(marketCode: string) {
    // เปลี่ยนตลาดแล้วรายการแผงเป็นคนละชุด ต้องเลือกแผงใหม่ทั้งหมด
    onChange({ marketCode, booths: group.booths.map((b) => ({ ...b, boothCode: "" })) });
  }

  return (
    <div className="rounded-[22px] border-2 border-dashed border-primary/40 p-6">
      <div className="mb-4 flex items-center justify-between text-xl font-bold text-primary">
        <span>{title}</span>
        {canRemove && onRemove && (
          <button type="button" className="gate-remove-btn" tabIndex={-1} onClick={onRemove}>
            ลบตลาด
          </button>
        )}
      </div>

      <div className="mb-4">
        <label className="gate-field-label">เลือกประเภทตลาด (Market)</label>
        <GateSelect
          instanceId={`market-${group.id}`}
          options={marketOptions}
          value={group.marketCode}
          placeholder={marketPlaceholder}
          isLoading={marketOptionsLoading}
          isDisabled={marketLocked || marketOptionsLoading || marketOptions.length === 0}
          onChange={changeMarket}
        />
        {marketLocked && (
          <p className="mt-2 text-base text-text-gray">เปลี่ยนตลาดไม่ได้ เพราะมีแผงที่ส่งยอดแล้ว</p>
        )}
      </div>

      <div className="mb-6">
        <label className="gate-field-label">จุดจอดส่งสินค้า (Dropoff Point)</label>
        <input
          className="gate-input"
          type="text"
          placeholder="เช่น Gate 1 - Zone A"
          required
          value={group.dropoffPoint}
          onChange={(e) => onChange({ dropoffPoint: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-6">
        {group.booths.map((booth, boothIndex) => (
          <BoothGroupCard
            key={booth.id}
            booth={booth}
            index={boothIndex}
            products={products}
            boothOptions={boothOptions}
            boothOptionsLoading={boothOptionsLoading}
            boothOptionsPlaceholder={boothOptionsPlaceholder}
            canRemove={group.booths.length > 1}
            highlighted={Boolean(highlightedBoothCodes?.includes(booth.boothCode))}
            onChange={(patch) => updateBooth(booth.id, patch)}
            onRemove={() => removeBooth(booth.id)}
          />
        ))}
      </div>

      <button type="button" className="gate-add-btn" onClick={addBooth}>
        + เพิ่มแผง
      </button>
    </div>
  );
}
