"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import GateErrorBanner from "@/components/GateErrorBanner";
import { MarketGroupCard } from "@/components/MarketGroupCard";
import TicketResultView from "@/components/TicketResult";
import { useGateOptions } from "@/hooks/useGateOptions";
import { GATE_NO } from "@/lib/gateConstants";
import { clientErrorInfo, networkErrorInfo, readGateError, type GateErrorInfo } from "@/lib/gateErrors";
import {
  buildPreviewPayload,
  buildTicketCreateDraft,
  validateMarketGroups,
  validateTicketNumber,
} from "@/lib/gatePayload";
import { createEmptyMarketGroup, type MarketGroupFormState } from "@/types/gateForm";
import type { GateTicketResponse } from "@/types/gate";

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
  const [result, setResult] = useState<GateTicketResponse | null>(null);
  const [error, setError] = useState<GateErrorInfo | null>(null);

  const [marketGroups, setMarketGroups] = useState<MarketGroupFormState[]>(() => [
    createEmptyMarketGroup("market-1"),
  ]);

  // เพิ่มตั๋วให้รถคันเดิม = POST ด้วย TicketNumber เดิม ระบบเพิ่มตั๋วเข้ารถคันนั้น ไม่สร้างรถใหม่
  const [addToExisting, setAddToExisting] = useState(false);
  const [existingTicketNumber, setExistingTicketNumber] = useState("");

  const [previewTicketNumber, setPreviewTicketNumber] = useState("");
  const [previewTicketNoList, setPreviewTicketNoList] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // IdempotencyKey ของบิลที่ส่งไปแล้วแต่ยังไม่สำเร็จ — กดส่งซ้ำด้วยข้อมูลเดิมต้องใช้ key เดิม
  // (proxy จะใช้ TicketNumber/TicketNo ชุดเดิม backend จึง replay ให้ ไม่ออกตั๋วซ้ำ) ถ้าข้อมูลเปลี่ยนให้สร้าง key ใหม่
  const pendingSubmitRef = useRef<{ key: string; fingerprint: string } | null>(null);

  const selectedMarketCodes = useMemo(() => marketGroups.map((g) => g.marketCode), [marketGroups]);
  const {
    products,
    marketOptions,
    optionsLoading,
    marketPlaceholder,
    boothOptionsFor,
    isBoothsLoading,
    boothPlaceholderFor,
  } = useGateOptions(selectedMarketCodes);

  const targetTicketNumber = addToExisting ? existingTicketNumber.trim() : undefined;

  // TicketNo เป็นตัวนับกลางตัวเดียวรวมทุกตลาด — preview จึงต้องขอ "เลขถัดไป N ตัว" ตามจำนวนตลาดในบิลนี้
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

  useEffect(() => {
    (async () => {
      await refreshPreviewTicketNumber(marketGroups.length);
    })();
  }, [marketGroups.length]);

  const jsonPreview = useMemo(
    () => buildPreviewPayload(marketGroups, previewTicketNumber, previewTicketNoList, targetTicketNumber),
    [marketGroups, previewTicketNumber, previewTicketNoList, targetTicketNumber],
  );

  function marketOptionsForGroup(groupId: string) {
    const takenByOthers = new Set(
      marketGroups.filter((g) => g.id !== groupId && g.marketCode).map((g) => g.marketCode),
    );
    return marketOptions.filter((opt) => !takenByOthers.has(opt.value));
  }

  function updateMarketGroup(id: string, patch: Partial<MarketGroupFormState>) {
    setMarketGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function addMarketGroup() {
    setMarketGroups((prev) => [...prev, createEmptyMarketGroup()]);
  }

  function removeMarketGroup(id: string) {
    setMarketGroups((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError =
      (targetTicketNumber !== undefined ? validateTicketNumber(targetTicketNumber) : null) ??
      validateMarketGroups(marketGroups);
    if (validationError) {
      setError(clientErrorInfo(validationError));
      return;
    }

    const fingerprint = JSON.stringify(buildTicketCreateDraft(marketGroups, "", targetTicketNumber));
    if (pendingSubmitRef.current?.fingerprint !== fingerprint) {
      pendingSubmitRef.current = { key: crypto.randomUUID(), fingerprint };
    }
    const payload = buildTicketCreateDraft(marketGroups, pendingSubmitRef.current.key, targetTicketNumber);

    setSubmitting(true);
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(await readGateError(response));
        return;
      }

      // CREATED และ REPLAYED แสดงผลเหมือนกัน (REPLAYED = ตั๋วที่ออกไว้แล้วจากการกดส่งครั้งก่อน)
      const apiResponse: GateTicketResponse = await response.json();
      pendingSubmitRef.current = null;
      setResult(apiResponse);
    } catch (err) {
      console.error(err);
      setError(networkErrorInfo(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <TicketResultView
        data={result}
        onBack={() => {
          setResult(null);
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
        <p>
          เพิ่มรายการสินค้าและระบุจำนวนให้ครบถ้วน · ช่อง Gate: <strong>{GATE_NO}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6 rounded-[22px] border-2 border-border p-5">
          <label className="flex cursor-pointer items-center gap-3 text-lg font-semibold text-text-dark">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={addToExisting}
              onChange={(e) => setAddToExisting(e.target.checked)}
            />
            เพิ่มตั๋วให้รถคันเดิม (ใช้เลขที่บิลเดิม)
          </label>
          {addToExisting && (
            <div className="mt-4">
              <label className="gate-field-label">เลขที่บิลเดิม (TicketNumber 14 หลัก)</label>
              <input
                className="gate-input"
                type="text"
                inputMode="numeric"
                maxLength={14}
                placeholder="เช่น 48213907562214"
                value={existingTicketNumber}
                onChange={(e) => setExistingTicketNumber(e.target.value.replace(/\D/g, ""))}
              />
              <p className="mt-2 text-base text-text-gray">
                ⚠️ ถ้ารถคันนี้กำลังทำงานอยู่ ทุกแผงของรถจะส่งยอดไม่ได้จนกว่าคนงานที่เพิ่มจะสแกนครบ
                ควรออกตั๋วให้ครบตั้งแต่ครั้งแรกถ้าเป็นไปได้
              </p>
            </div>
          )}
        </div>

        <div className="mb-6 flex flex-col gap-6">
          {marketGroups.map((group, index) => (
            <MarketGroupCard
              key={group.id}
              group={group}
              title={`ตลาดที่ ${index + 1}`}
              products={products}
              marketOptions={marketOptionsForGroup(group.id)}
              marketOptionsLoading={optionsLoading}
              marketPlaceholder={marketPlaceholder}
              boothOptions={boothOptionsFor(group.marketCode)}
              boothOptionsLoading={isBoothsLoading(group.marketCode)}
              boothOptionsPlaceholder={boothPlaceholderFor(group.marketCode)}
              highlightedBoothCodes={error?.boothCodes}
              canRemove={marketGroups.length > 1}
              onChange={(patch) => updateMarketGroup(group.id, patch)}
              onRemove={() => removeMarketGroup(group.id)}
            />
          ))}
        </div>

        <button type="button" className="gate-add-btn" onClick={addMarketGroup}>
          + เพิ่มตลาด
        </button>

        <JsonPreview data={jsonPreview} />

        {error && (
          <div className="mt-6">
            <GateErrorBanner error={error} onClose={() => setError(null)} />
          </div>
        )}

        <button type="submit" className="gate-submit-btn" disabled={submitting}>
          {submitting ? "กำลังดำเนินการ..." : "ยืนยันการส่งข้อมูลทั้งหมด"}
        </button>
      </form>
    </div>
  );
}

export default GateForm;
