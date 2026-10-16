"use client";

import { useMemo, useState, type FormEvent } from "react";
import GateErrorBanner from "@/components/GateErrorBanner";
import { MarketGroupCard } from "@/components/MarketGroupCard";
import TicketResultView from "@/components/TicketResult";
import { useGateOptions } from "@/hooks/useGateOptions";
import { GATE_NO, TICKET_NO_PATTERN } from "@/lib/gateConstants";
import { clientErrorInfo, networkErrorInfo, readGateError, type GateErrorInfo } from "@/lib/gateErrors";
import { buildTicketUpdateDraft, detailToMarketGroup, validateMarketGroups } from "@/lib/gatePayload";
import type { MarketGroupFormState } from "@/types/gateForm";
import type { GateTicketDetailResponse, GateTicketResponse } from "@/types/gate";

const VEHICLE_JOB_STATUS_LABELS: Record<string, string> = {
  WAIT: "รอจ่ายงาน",
  WORKING: "กำลังทำงาน",
  RELEASED: "ปล่อยรถแล้ว",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  WAIT: "รอดำเนินการ",
  WORKING: "กำลังทำงาน",
  COMPLETED: "เสร็จสิ้น",
};

const CLOSED_ERROR_CODES = new Set(["GATE_TICKET_CLOSED", "VEHICLE_JOB_CLOSED"]);

function isClosed(detail: GateTicketDetailResponse): boolean {
  return (
    ["COMPLETED", "CANCELLED"].includes(detail.Vehicle.Status) || detail.Market.Status === "COMPLETED"
  );
}

function TicketEditor() {
  const [lookupNo, setLookupNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<GateErrorInfo | null>(null);

  const [detail, setDetail] = useState<GateTicketDetailResponse | null>(null);
  const [group, setGroup] = useState<MarketGroupFormState | null>(null);
  const [forceReadOnly, setForceReadOnly] = useState(false);
  const [result, setResult] = useState<GateTicketResponse | null>(null);

  const selectedMarketCodes = useMemo(() => (group ? [group.marketCode] : []), [group]);
  const {
    products,
    marketOptions,
    optionsLoading,
    marketPlaceholder,
    boothOptionsFor,
    isBoothsLoading,
    boothPlaceholderFor,
  } = useGateOptions(selectedMarketCodes);

  const readOnly = forceReadOnly || (detail ? isClosed(detail) : false);

  // ตอนอ่านอย่างเดียว ล็อกทุกแผงไว้ในฟอร์ม (ไม่ได้ส่งไป backend เพราะปุ่มบันทึกถูกซ่อน)
  const displayGroup = useMemo(
    () => (group && readOnly ? { ...group, booths: group.booths.map((b) => ({ ...b, locked: true })) } : group),
    [group, readOnly],
  );

  async function loadTicket(ticketNo: string): Promise<boolean> {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketNo}`, { cache: "no-store" });
      if (!res.ok) {
        setError(await readGateError(res));
        setDetail(null);
        setGroup(null);
        return false;
      }
      const data: GateTicketDetailResponse = await res.json();
      setDetail(data);
      setGroup(detailToMarketGroup(data));
      setForceReadOnly(false);
      return true;
    } catch (err) {
      setError(networkErrorInfo(err));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const ticketNo = lookupNo.trim();
    if (!TICKET_NO_PATTERN.test(ticketNo)) {
      setError(clientErrorInfo("เลขที่ใบ (TicketNo) ต้องเป็นตัวเลข 14 หลัก"));
      return;
    }
    await loadTicket(ticketNo);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!detail || !group) return;
    setError(null);

    const validationError = validateMarketGroups([group]);
    if (validationError) {
      setError(clientErrorInfo(validationError));
      return;
    }

    const ticketNo = detail.Market.TicketNo;
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticketNo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Version กันเขียนทับข้อมูลที่คนอื่นแก้ไปแล้วตั้งแต่ตอน GET
        body: JSON.stringify(buildTicketUpdateDraft(group, detail.Version)),
      });

      if (!res.ok) {
        const info = await readGateError(res);
        if (info.code === "TICKET_VERSION_CONFLICT") {
          await loadTicket(ticketNo);
        } else if (info.code && CLOSED_ERROR_CODES.has(info.code)) {
          setForceReadOnly(true);
        }
        setError(info);
        return;
      }

      setResult(await res.json());
    } catch (err) {
      setError(networkErrorInfo(err));
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <TicketResultView
        data={result}
        title={result.Result === "NO_CHANGE" ? "ไม่มีการเปลี่ยนแปลง" : "แก้ไขตั๋วสำเร็จ"}
        backLabel="กลับไปหน้าแก้ไขตั๋ว"
        onBack={() => {
          const ticketNo = detail?.Market.TicketNo;
          setResult(null);
          if (ticketNo) loadTicket(ticketNo);
        }}
      />
    );
  }

  return (
    <div className="gate-card">
      <div className="gate-header">
        <h2>ค้นหา / แก้ไขตั๋ว</h2>
        <p>
          กรอกหรือสแกนเลขที่ใบ (TicketNo) · ช่อง Gate ที่แก้ไข: <strong>{GATE_NO}</strong>
        </p>
      </div>

      <form onSubmit={handleLookup} className="mb-6 flex gap-3 max-[500px]:flex-col">
        <input
          className="gate-input flex-1"
          type="text"
          inputMode="numeric"
          maxLength={14}
          placeholder="เลขที่ใบ 14 หลัก"
          autoFocus
          value={lookupNo}
          onChange={(e) => setLookupNo(e.target.value.replace(/\D/g, ""))}
        />
        <button type="submit" className="gate-btn gate-btn-primary !flex-none px-8" disabled={loading}>
          {loading ? "กำลังค้นหา..." : "ค้นหา"}
        </button>
      </form>

      {error && <GateErrorBanner error={error} onClose={() => setError(null)} />}

      {detail && displayGroup && (
        <form onSubmit={handleSave}>
          <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border-2 border-border p-5 text-lg max-[500px]:grid-cols-1">
            <div>
              เลขที่ใบ: <strong>{detail.Market.TicketNo}</strong>
            </div>
            <div>
              เลขที่บิล: <strong>{detail.TicketNumber}</strong>
            </div>
            <div>
              สถานะรถ: <strong>{VEHICLE_JOB_STATUS_LABELS[detail.Vehicle.Status] ?? detail.Vehicle.Status}</strong>
            </div>
            <div>
              สถานะตั๋ว: <strong>{TICKET_STATUS_LABELS[detail.Market.Status] ?? detail.Market.Status}</strong>
            </div>
            <div>
              ออกตั๋วที่ Gate: <strong>{detail.GateNo || "-"}</strong>
            </div>
            <div>
              คนงานของตั๋ว / ทั้งคัน:{" "}
              <strong>
                {detail.Market.WorkerCount} / {detail.WorkerCount} คน
              </strong>
            </div>
          </div>

          {readOnly && (
            <div className="mb-6 rounded-xl bg-[#edf2f7] p-3 text-center text-base text-text-gray">
              ตั๋วหรืองานรถปิดแล้ว ดูข้อมูลได้อย่างเดียว
            </div>
          )}

          <MarketGroupCard
            group={displayGroup}
            title={`ตลาด ${detail.Market.MarketName}`}
            products={products}
            marketOptions={marketOptions}
            marketOptionsLoading={optionsLoading}
            marketPlaceholder={marketPlaceholder}
            marketLocked={readOnly || !detail.Market.MarketEditable}
            boothOptions={boothOptionsFor(displayGroup.marketCode)}
            boothOptionsLoading={isBoothsLoading(displayGroup.marketCode)}
            boothOptionsPlaceholder={boothPlaceholderFor(displayGroup.marketCode)}
            highlightedBoothCodes={error?.boothCodes}
            canRemove={false}
            onChange={(patch) => !readOnly && setGroup((prev) => (prev ? { ...prev, ...patch } : prev))}
          />

          {!readOnly && (
            <button type="submit" className="gate-submit-btn" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </button>
          )}
        </form>
      )}
    </div>
  );
}

export default TicketEditor;
