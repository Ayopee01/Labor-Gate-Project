"use client";

import type { GateErrorInfo } from "@/lib/gateErrors";

const KIND_HINTS: Record<GateErrorInfo["kind"], string> = {
  fix: "กรุณาตรวจสอบข้อมูลแล้วลองใหม่",
  admin: "ต้องให้ Admin แก้ไขข้อมูลในระบบก่อน",
  retry: "กดส่งอีกครั้งได้เลย ระบบจะไม่ออกตั๋วซ้ำ",
};

function GateErrorBanner({ error, onClose }: { error: GateErrorInfo; onClose: () => void }) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-2xl border-2 border-primary bg-primary-light p-5 text-lg text-text-dark print:hidden"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <strong className="text-xl text-primary">{error.message}</strong>
          <span className="text-base text-text-gray">{KIND_HINTS[error.kind]}</span>
          {error.boothCodes && error.boothCodes.length > 0 && (
            <span className="text-base">แผงที่เกี่ยวข้อง: {error.boothCodes.join(", ")}</span>
          )}
          {error.detail && <span className="break-words text-sm text-text-gray">{error.detail}</span>}
          {(error.code || error.status) && (
            <span className="font-mono text-sm text-text-gray">
              {error.status ? `HTTP ${error.status}` : ""} {error.code ?? ""}
            </span>
          )}
          {error.requestId && (
            <span className="text-sm text-text-gray">
              request_id (แนบเวลาแจ้งทีม Backend):{" "}
              <code className="select-all rounded bg-white px-1.5 py-0.5 font-mono">{error.requestId}</code>
            </span>
          )}
        </div>
        <button type="button" className="gate-remove-btn" onClick={onClose}>
          ปิด
        </button>
      </div>
    </div>
  );
}

export default GateErrorBanner;
