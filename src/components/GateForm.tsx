"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Select, { type SingleValue } from "react-select";
import TicketResultView from "@/components/TicketResult";
import { buildPreviewPayload, buildTicketBatchRequest, validateMarketGroups } from "@/lib/gatePayload";
import {
  createEmptyBooth,
  createEmptyItem,
  createEmptyMarketGroup,
  type BoothFormState,
  type ItemFormState,
  type MarketGroupFormState,
} from "@/types/gateForm";
import type { GateBooth, GateMarket, GateProduct, TicketBatchResponse } from "@/types/gate";

interface GateOption {
  value: string;
  label: string;
}

function GateSelect({
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
  const selected = options.find((opt) => opt.value === value) ?? null;

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
        control: ({ isFocused }) =>
          `!min-h-0 rounded-xl border-2 bg-[#f7fafc] px-3 py-2 text-lg transition ${
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

function ItemCard({
  item,
  index,
  products,
  canRemove,
  onChange,
  onRemove,
}: {
  item: ItemFormState;
  index: number;
  products: GateProduct[];
  canRemove: boolean;
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
        {canRemove && (
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
            isDisabled={!item.productCode}
            onChange={(packageCode) => onChange({ packageCode })}
          />
        </div>

        <div className="col-span-2 max-[480px]:col-span-1">
          <label className="gate-field-label">จำนวน (ชิ้น)</label>
          <input
            className="gate-input"
            type="number"
            min={1}
            placeholder="ระบุจำนวน"
            required
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
  onChange: (patch: Partial<BoothFormState>) => void;
  onRemove: () => void;
}) {
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
    <div className="gate-booth-group">
      <div className="gate-booth-group-header">
        <span>
          แผงที่ <span>{index + 1}</span>
        </span>
        {canRemove && (
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
          isDisabled={boothOptions.length === 0}
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
            onChange={(patch) => updateItem(item.id, patch)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>

      <button type="button" className="gate-add-btn" onClick={addItem}>
        + เพิ่มสินค้าอีกชนิด
      </button>
    </div>
  );
}

function MarketGroupCard({
  group,
  index,
  products,
  marketOptions,
  marketOptionsLoading,
  marketPlaceholder,
  boothOptions,
  boothOptionsLoading,
  boothOptionsPlaceholder,
  canRemove,
  onMarketChange,
  onBoothsChange,
  onRemove,
}: {
  group: MarketGroupFormState;
  index: number;
  products: GateProduct[];
  marketOptions: GateOption[];
  marketOptionsLoading: boolean;
  marketPlaceholder: string;
  boothOptions: GateOption[];
  boothOptionsLoading: boolean;
  boothOptionsPlaceholder: string;
  canRemove: boolean;
  onMarketChange: (marketCode: string) => void;
  onBoothsChange: (booths: BoothFormState[]) => void;
  onRemove: () => void;
}) {
  function updateBooth(boothId: string, patch: Partial<BoothFormState>) {
    onBoothsChange(group.booths.map((b) => (b.id === boothId ? { ...b, ...patch } : b)));
  }

  function removeBooth(boothId: string) {
    onBoothsChange(group.booths.filter((b) => b.id !== boothId));
  }

  function addBooth() {
    onBoothsChange([...group.booths, createEmptyBooth()]);
  }

  return (
    <div className="rounded-[22px] border-2 border-dashed border-primary/40 p-6">
      <div className="mb-4 flex items-center justify-between text-xl font-bold text-primary">
        <span>
          ตลาดที่ <span>{index + 1}</span>
        </span>
        {canRemove && (
          <button type="button" className="gate-remove-btn" tabIndex={-1} onClick={onRemove}>
            ลบตลาด
          </button>
        )}
      </div>

      <div className="mb-6">
        <label className="gate-field-label">เลือกประเภทตลาด (Market)</label>
        <GateSelect
          instanceId={`market-${group.id}`}
          options={marketOptions}
          value={group.marketCode}
          placeholder={marketPlaceholder}
          isLoading={marketOptionsLoading}
          isDisabled={marketOptionsLoading || marketOptions.length === 0}
          onChange={onMarketChange}
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

function JsonPreview({ data }: { data: unknown }) {
  return (
    <div className="gate-json-preview">
      <div className="mb-2 border-b border-[#4a5568] pb-2 font-bold text-[#cbd5e0]">
        ข้อมูล JSON ที่จะส่งไป Backend:
      </div>
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(data, null, 2)}
      </pre>
      <div className="mt-2 text-xs text-[#a0aec0]">
        * TicketNumber/TicketNo ที่เห็นด้านบนเป็นแค่เลขตัวอย่าง (ถ้ากดยืนยันตอนนี้จะได้เลขนี้) ยังไม่ได้ถูกจองจริง
        เลขจริงจะถูกออกให้ตอนกดยืนยันส่งข้อมูลเท่านั้น จึงอาจเห็นเลขเดิมซ้ำกันได้ถ้าเปิดหลายเบราว์เซอร์พร้อมกันโดยยังไม่กดส่ง
      </div>
    </div>
  );
}

function GateForm() {
  const [batchResult, setBatchResult] = useState<TicketBatchResponse | null>(null);

  const [markets, setMarkets] = useState<GateMarket[]>([]);
  const [products, setProducts] = useState<GateProduct[]>([]);
  const [marketGroups, setMarketGroups] = useState<MarketGroupFormState[]>(() => [
    createEmptyMarketGroup("market-1"),
  ]);

  // แคช options ของแผงต่อตลาด (คนละตลาดในบิลเดียวกันมีรายการแผงคนละชุด)
  const [boothOptionsByMarket, setBoothOptionsByMarket] = useState<Record<string, GateBooth[]>>({});
  const [boothsLoadingSet, setBoothsLoadingSet] = useState<Set<string>>(new Set());
  const [boothsErrorSet, setBoothsErrorSet] = useState<Set<string>>(new Set());

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState(false);

  const [previewTicketNumber, setPreviewTicketNumber] = useState("");
  const [previewTicketNoList, setPreviewTicketNoList] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const activeMarketCodes = useMemo(
    () => Array.from(new Set(marketGroups.map((g) => g.marketCode).filter(Boolean))),
    [marketGroups],
  );
  const activeMarketCodesKey = activeMarketCodes.join(",");

  // TicketNo เป็นตัวนับกลางตัวเดียวรวมทุกตลาด — preview จึงต้องขอ "เลขถัดไป N ตัว" ตามจำนวน
  // ตลาดในบิลนี้ (N = marketGroups.length) ไม่ได้อิงกับ MarketCode ไหนโดยเฉพาะอีกต่อไป
  async function refreshPreviewTicketNumber(count: number) {
    try {
      const res = await fetch(`/api/ticket-number?count=${Math.max(count, 1)}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setPreviewTicketNumber(data.ticketNumber ?? "");
      setPreviewTicketNoList(data.ticketNoPreview ?? []);
    } catch (e) {
      console.warn("Could not load ticket number preview", e);
    }
  }

  // ตอนโหลดหน้าเว็บ ให้ดึง options มาก่อน
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/options");
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setProducts(data.Products || []);
        setMarkets(data.Markets || []);
      } catch (e) {
        console.warn("Could not load options from backend API", e);
        if (!cancelled) setOptionsError(true);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ดึงเลขที่ใบสำหรับ preview จากตัวนับฝั่ง server (กันไม่ให้เลขซ้ำข้ามเครื่อง/ข้าม browser)
  // ทุกครั้งที่จำนวนตลาดในบิลนี้เปลี่ยนไป (TicketNo เป็นตัวนับกลาง ไม่ได้อิงกับ MarketCode ไหนโดยเฉพาะ)
  useEffect(() => {
    (async () => {
      await refreshPreviewTicketNumber(marketGroups.length);
    })();
  }, [marketGroups.length]);

  // โหลดรายการแผง (Booths) ของทุกตลาดที่ถูกเลือกอยู่ตอนนี้ แต่ยังไม่เคยโหลด/กำลังโหลดอยู่
  useEffect(() => {
    const toFetch = activeMarketCodes.filter(
      (code) => !(code in boothOptionsByMarket) && !boothsLoadingSet.has(code),
    );
    if (toFetch.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoothsLoadingSet((prev) => new Set([...prev, ...toFetch]));
    toFetch.forEach((code) => {
      (async () => {
        try {
          const res = await fetch(`/api/options?MarketCode=${encodeURIComponent(code)}`);
          if (!res.ok) throw new Error(`Error ${res.status}`);
          const data = await res.json();
          setBoothOptionsByMarket((prev) => ({ ...prev, [code]: data.Booths || [] }));
        } catch (e) {
          console.warn("Could not load booths for market", code, e);
          setBoothOptionsByMarket((prev) => ({ ...prev, [code]: [] }));
          setBoothsErrorSet((prev) => new Set([...prev, code]));
        } finally {
          setBoothsLoadingSet((prev) => {
            const next = new Set(prev);
            next.delete(code);
            return next;
          });
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMarketCodesKey]);

  const jsonPreview = useMemo(
    () => buildPreviewPayload(marketGroups, previewTicketNumber, previewTicketNoList),
    [marketGroups, previewTicketNumber, previewTicketNoList],
  );

  const marketOptions: GateOption[] = markets.map((m) => ({
    value: m.MarketCode,
    label: `${m.MarketName} (${m.MarketCode})`,
  }));

  const marketPlaceholder = optionsLoading
    ? "-- กำลังโหลดข้อมูลตลาด --"
    : optionsError
      ? "-- ไม่สามารถโหลดข้อมูลตลาดได้ --"
      : marketOptions.length === 0
        ? "-- ไม่พบข้อมูลตลาด --"
        : "-- เลือกตลาด --";

  function marketOptionsForGroup(groupId: string): GateOption[] {
    const takenByOthers = new Set(
      marketGroups.filter((g) => g.id !== groupId && g.marketCode).map((g) => g.marketCode),
    );
    return marketOptions.filter((opt) => !takenByOthers.has(opt.value));
  }

  function boothOptionsForGroup(group: MarketGroupFormState): GateOption[] {
    return (boothOptionsByMarket[group.marketCode] ?? []).map((b) => ({
      value: b.BoothCode,
      label: `${b.BoothName ?? ""} (${b.BoothCode})`.trim(),
    }));
  }

  function boothPlaceholderForGroup(group: MarketGroupFormState): string {
    if (!group.marketCode) return "-- กรุณาเลือกตลาดก่อน --";
    if (boothsErrorSet.has(group.marketCode)) return "-- ไม่สามารถโหลดข้อมูลแผงได้ --";
    const loaded = boothOptionsByMarket[group.marketCode];
    if ((loaded?.length ?? 0) === 0 && !boothsLoadingSet.has(group.marketCode)) {
      return "-- ไม่พบแผงที่ใช้งานได้ในตลาดนี้ --";
    }
    return "-- เลือกแผง --";
  }

  function updateMarketGroup(id: string, patch: Partial<MarketGroupFormState>) {
    setMarketGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function handleMarketCodeChange(groupId: string, code: string) {
    setMarketGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, marketCode: code, booths: g.booths.map((b) => ({ ...b, boothCode: "" })) }
          : g,
      ),
    );
  }

  function addMarketGroup() {
    setMarketGroups((prev) => [...prev, createEmptyMarketGroup()]);
  }

  function removeMarketGroup(id: string) {
    setMarketGroups((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const validationError = validateMarketGroups(marketGroups);
    if (validationError) {
      alert(validationError);
      return;
    }

    setSubmitting(true);
    try {
      // TicketNumber/TicketNo ที่ preview ไว้เป็นแค่ตัวอย่าง — /api/tickets จะสุ่ม TicketNumber และ
      // หัก TicketNo จริงแบบ atomic ให้เองเสมอ กันเลขซ้ำ/เลขชนเวลามีคนกดพร้อมกันจากหลายเครื่อง
      const payload = buildTicketBatchRequest(marketGroups);
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Error ${response.status}: ${errText}`);
      }

      const apiResponse: TicketBatchResponse = await response.json();
      setBatchResult(apiResponse);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ (Error): \n${message}\nกรุณาลองใหม่`);
    } finally {
      setSubmitting(false);
    }
  }

  if (batchResult) {
    return (
      <TicketResultView
        data={batchResult}
        onBack={() => {
          setBatchResult(null);
          // ใบก่อนหน้าหักตัวนับไปแล้ว ต้องดึงเลข preview ใหม่ก่อนกรอกใบถัดไป
          refreshPreviewTicketNumber(marketGroups.length);
        }}
      />
    );
  }

  return (
    <div className="gate-card">
      <div className="gate-header">
        <h2>คำนวณแรงงาน &amp; คำนวณเงิน</h2>
        <p>เพิ่มรายการสินค้าและระบุจำนวนให้ครบถ้วน</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6 flex flex-col gap-6">
          {marketGroups.map((group, index) => (
            <MarketGroupCard
              key={group.id}
              group={group}
              index={index}
              products={products}
              marketOptions={marketOptionsForGroup(group.id)}
              marketOptionsLoading={optionsLoading}
              marketPlaceholder={marketPlaceholder}
              boothOptions={boothOptionsForGroup(group)}
              boothOptionsLoading={boothsLoadingSet.has(group.marketCode)}
              boothOptionsPlaceholder={boothPlaceholderForGroup(group)}
              canRemove={marketGroups.length > 1}
              onMarketChange={(code) => handleMarketCodeChange(group.id, code)}
              onBoothsChange={(booths) => updateMarketGroup(group.id, { booths })}
              onRemove={() => removeMarketGroup(group.id)}
            />
          ))}
        </div>

        <button type="button" className="gate-add-btn" onClick={addMarketGroup}>
          + เพิ่มตลาด
        </button>

        <JsonPreview data={jsonPreview} />

        <button type="submit" className="gate-submit-btn" disabled={submitting}>
          {submitting ? "กำลังดำเนินการ..." : "ยืนยันการส่งข้อมูลทั้งหมด"}
        </button>
      </form>
    </div>
  );
}

export default GateForm;
