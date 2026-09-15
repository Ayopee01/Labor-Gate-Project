"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Select, { type SingleValue } from "react-select";
import TicketResultView from "@/components/TicketResult";
import { buildTicketPayload, validateBooths } from "@/lib/gatePayload";
import { createEmptyBooth, createEmptyItem, type BoothFormState, type ItemFormState } from "@/types/gateForm";
import type { GateBooth, GateMarket, GateProduct, TicketResult } from "@/types/gate";

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

function JsonPreview({ data }: { data: unknown }) {
  return (
    <div className="gate-json-preview">
      <div className="mb-2 border-b border-[#4a5568] pb-2 font-bold text-[#cbd5e0]">
        ข้อมูล JSON ที่จะส่งไป Backend:
      </div>
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function GateForm() {
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null);

  const [markets, setMarkets] = useState<GateMarket[]>([]);
  const [products, setProducts] = useState<GateProduct[]>([]);
  const [booths, setBooths] = useState<GateBooth[]>([]);
  const [marketCode, setMarketCode] = useState("");
  const [boothList, setBoothList] = useState<BoothFormState[]>(() => [createEmptyBooth("booth-1")]);

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState(false);
  const [boothsLoading, setBoothsLoading] = useState(false);
  const [boothsError, setBoothsError] = useState(false);

  const [previewTicketNumber, setPreviewTicketNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refreshPreviewTicketNumber() {
    try {
      const res = await fetch("/api/ticket-number");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setPreviewTicketNumber(data.ticketNumber ?? "");
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
  useEffect(() => {
    (async () => {
      await refreshPreviewTicketNumber();
    })();
  }, []);

  // เมื่อเปลี่ยนตลาด ให้โหลดรายการแผง (Booths) ของตลาดนั้นใหม่
  useEffect(() => {
    if (!marketCode) {
      return;
    }

    let cancelled = false;
    // Flip the loading flag before the fetch kicks off; this is the standard
    // "start loading" signal for an in-flight request triggered by marketCode changing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoothsLoading(true);
    setBoothsError(false);
    (async () => {
      try {
        const res = await fetch(`/api/options?MarketCode=${encodeURIComponent(marketCode)}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setBooths(data.Booths || []);
      } catch (e) {
        console.warn("Could not load booths for market", marketCode, e);
        if (!cancelled) {
          setBooths([]);
          setBoothsError(true);
        }
      } finally {
        if (!cancelled) setBoothsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [marketCode]);

  const jsonPreview = useMemo(
    () => buildTicketPayload(marketCode, boothList, previewTicketNumber),
    [marketCode, boothList, previewTicketNumber],
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

  const boothOptions: GateOption[] = booths.map((b) => ({
    value: b.BoothCode,
    label: `${b.BoothName ?? ""} (${b.BoothCode})`.trim(),
  }));

  const boothPlaceholder = !marketCode
    ? "-- กรุณาเลือกตลาดก่อน --"
    : boothsError
      ? "-- ไม่สามารถโหลดข้อมูลแผงได้ --"
      : boothOptions.length === 0 && !boothsLoading
        ? "-- ไม่พบแผงที่ใช้งานได้ในตลาดนี้ --"
        : "-- เลือกแผง --";

  function handleMarketChange(code: string) {
    setMarketCode(code);
    // ล้างรหัสแผงที่เคยเลือกไว้ เพราะรายการแผงจะเปลี่ยนไปตามตลาดใหม่
    setBoothList((prev) => prev.map((b) => ({ ...b, boothCode: "" })));
    setBooths([]);
    setBoothsError(false);
  }

  function updateBooth(id: string, patch: Partial<BoothFormState>) {
    setBoothList((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function removeBooth(id: string) {
    setBoothList((prev) => prev.filter((b) => b.id !== id));
  }

  function addBooth() {
    setBoothList((prev) => [...prev, createEmptyBooth()]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const validationError = validateBooths(marketCode, boothList);
    if (validationError) {
      alert(validationError);
      return;
    }

    setSubmitting(true);
    try {
      // previewTicketNumber เป็นแค่ค่า preview — /api/tickets จะหักเลขจริงแบบ atomic แล้ว
      // override ทับให้เองเสมอ กันเลขซ้ำเวลามีคนกดพร้อมกันจากหลายเครื่อง
      const payload = buildTicketPayload(marketCode, boothList, previewTicketNumber);
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Error ${response.status}: ${errText}`);
      }

      const apiResponse: TicketResult = await response.json();
      setTicketResult(apiResponse);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ (Error): \n${message}\nกรุณาลองใหม่`);
    } finally {
      setSubmitting(false);
    }
  }

  if (ticketResult) {
    return (
      <TicketResultView
        data={ticketResult}
        onBack={() => {
          setTicketResult(null);
          // ใบก่อนหน้าหักตัวนับไปแล้ว ต้องดึงเลข preview ใหม่ก่อนกรอกใบถัดไป
          refreshPreviewTicketNumber();
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
        <div className="mb-6 border-b-2 border-dashed border-border pb-6">
          <label className="gate-field-label text-primary">เลือกประเภทตลาด (Market)</label>
          <GateSelect
            instanceId="market-select"
            options={marketOptions}
            value={marketCode}
            placeholder={marketPlaceholder}
            isLoading={optionsLoading}
            isDisabled={optionsLoading || marketOptions.length === 0}
            onChange={handleMarketChange}
          />
        </div>

        <div className="flex flex-col gap-6">
          {boothList.map((booth, index) => (
            <BoothGroupCard
              key={booth.id}
              booth={booth}
              index={index}
              products={products}
              boothOptions={boothOptions}
              boothOptionsLoading={boothsLoading}
              boothOptionsPlaceholder={boothPlaceholder}
              canRemove={boothList.length > 1}
              onChange={(patch) => updateBooth(booth.id, patch)}
              onRemove={() => removeBooth(booth.id)}
            />
          ))}
        </div>

        <button type="button" className="gate-add-btn" onClick={addBooth}>
          + เพิ่มแผง
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
