"use client";

import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import type { GateTicketChanges, GateTicketResponse, GateTicketResponseMarket, GateVehicle } from "@/types/gate";

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  unload_now: "เรียกคนลงสินค้าทันที",
  waiting_unload: "รอคนขับแจ้งพร้อม",
};

function InfoRow({
  label,
  value,
  bordered,
  emphasize,
}: {
  label: string;
  value: string;
  bordered?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${bordered ? "border-t border-dashed border-border pt-3" : ""}`}>
      <span>{label}</span>
      <strong className={`text-right ${emphasize ? "text-[1.15rem] text-text-dark" : "text-[1.05rem] text-text-dark"}`}>
        {value}
      </strong>
    </div>
  );
}

function formatBangkokTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
}

function TicketBill({
  market,
  gateNo,
  vehicle,
  breakAfter,
}: {
  market: GateTicketResponseMarket;
  gateNo: string;
  vehicle: GateVehicle;
  breakAfter: boolean;
}) {
  const statusLabel = VEHICLE_STATUS_LABELS[vehicle.Status] ?? vehicle.Status;

  return (
    <div className={breakAfter ? "gate-ticket-page-break" : undefined}>
      <div className="mb-8 flex flex-col gap-3 rounded-2xl border-2 border-border p-5 text-lg">
        <InfoRow label="ช่อง Gate:" value={gateNo || "-"} emphasize />
        <InfoRow label="ตลาด:" value={`${market.MarketName} (${market.MarketCode})`} bordered />
        <InfoRow label="จุดจอดส่งสินค้า:" value={market.DropoffPoint || "-"} bordered emphasize />
        <InfoRow label="เลขที่ใบ (TicketNo):" value={market.TicketNo} bordered emphasize />
        <InfoRow label="เวลาออกตั๋ว:" value={formatBangkokTime(market.TicketCreatedAt)} bordered />
        <div className="flex items-center justify-between gap-4 border-t border-dashed border-border pt-3">
          <span>สถานะ:</span>
          <strong
            className="text-right text-[1.15rem] text-text-dark"
            title={vehicle.Status === "unload_now" ? "รถเข้าคิวรอ Worker แล้ว ระบบจะเรียกคนเมื่อได้ครบทีม" : undefined}
          >
            {statusLabel}
          </strong>
        </div>
        <InfoRow
          label="รถขนส่ง:"
          value={`${vehicle.LicensePlate || "-"} (${vehicle.LicensePlateProvince || "-"}) · ${vehicle.VehicleTypeName || "-"}`}
          bordered
        />
      </div>

      <div className="mb-8 flex flex-col items-center gap-1 rounded-2xl border-2 border-border bg-white p-5">
        <span className="mb-1 text-lg font-medium text-text-gray">Barcode สำหรับสแกน</span>
        <Barcode value={market.TicketNo} format="CODE128" height={60} fontSize={18} margin={0} />
      </div>

      <div className="mb-8">
        <div className="gate-section-title">รายการสินค้าที่บันทึก</div>
        <div className="flex flex-col gap-3">
          {market.Booths.map((booth) => (
            <div key={booth.BoothCode}>
              <div className="mt-2 border-b border-dashed border-border pb-1 text-lg font-semibold text-primary first:mt-0">
                แผง {booth.BoothCode}
                {booth.BoothName ? ` - ${booth.BoothName}` : ""}
              </div>
              {booth.Products.map((p) => (
                <div
                  key={`${p.ProductCode}|${p.PackageCode}`}
                  className="mt-3 grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-border bg-[#f8fafc] p-5"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="text-xl font-semibold text-text-dark">{p.ProductName}</div>
                    <div className="text-lg text-text-gray">แพ็กเกจ: {p.PackageName}</div>
                    <div className="mt-1.5">
                      <span className="inline-block rounded-md bg-secondary-light px-2.5 py-1 text-[0.95rem] font-medium text-secondary">
                        ใช้คนงาน: {p.WorkerCount} คน
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-2xl font-bold text-primary">
                    {p.Quantity.toLocaleString()} <span className="text-base font-medium text-text-gray">ชิ้น</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="gate-section-title">สรุปการจัดสรรแรงงาน (ตั๋วใบนี้)</div>
        <div className="mt-4 grid grid-cols-2 gap-5 max-[500px]:grid-cols-1">
          <div className="rounded-[20px] border border-[rgba(211,47,47,0.1)] bg-primary-light p-6 text-center">
            <div className="mb-2 text-lg font-medium text-text-gray">จำนวนแผง</div>
            <div className="text-[2.2rem] font-bold text-primary">{market.BoothCount}</div>
          </div>
          <div className="rounded-[20px] border border-[rgba(46,125,50,0.1)] bg-secondary-light p-6 text-center">
            <div className="mb-2 text-lg font-medium text-text-gray">คนงานที่ต้องใช้</div>
            <div className="text-[2.2rem] font-bold text-secondary">{market.WorkerCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangesSummary({ changes }: { changes: GateTicketChanges }) {
  const rows: { label: string; codes: string[] }[] = [
    { label: "เพิ่ม", codes: changes.Added },
    { label: "นำออก", codes: changes.Removed },
    { label: "แก้ไข", codes: changes.Updated },
    { label: "คงเดิม", codes: changes.Unchanged },
  ];

  return (
    <div className="mb-8 rounded-2xl border-2 border-border p-5 text-lg print:hidden">
      <div className="gate-section-title">สรุปการแก้ไข</div>
      <div className="flex flex-col gap-2">
        <InfoRow label="เปลี่ยนตลาด:" value={changes.MarketChanged ? "ใช่" : "ไม่"} />
        <InfoRow label="เปลี่ยนจุดลงสินค้า:" value={changes.DropoffPointChanged ? "ใช่" : "ไม่"} bordered />
        {rows.map((row) => (
          <InfoRow
            key={row.label}
            label={`แผงที่${row.label}:`}
            value={row.codes.length > 0 ? row.codes.join(", ") : "-"}
            bordered
          />
        ))}
        <InfoRow
          label="คนงานของตั๋ว:"
          value={`${changes.PreviousWorkerCount} → ${changes.WorkerCount} คน`}
          bordered
          emphasize
        />
      </div>
    </div>
  );
}

interface TicketResultProps {
  data: GateTicketResponse;
  title?: string;
  backLabel?: string;
  onBack: () => void;
}

function TicketResult({ data, title, backLabel, onBack }: TicketResultProps) {
  const markets = data.Markets ?? [];
  const qrUrl = data.Qr?.DriverQrUrl;

  return (
    <div className="gate-card">
      <div className="gate-header">
        <h2>{title ?? "สรุปรายการสำเร็จ"}</h2>
        <p>รายละเอียดข้อมูลที่บันทึกเข้าระบบ</p>
      </div>

      {data.Result === "REPLAYED" && (
        <div className="mb-6 rounded-xl bg-[#edf2f7] p-3 text-center text-base text-text-gray print:hidden">
          ข้อมูลเดิม (ส่งซ้ำ) — ระบบคืนตั๋วที่ออกไว้แล้ว ไม่ได้สร้างตั๋วใหม่
        </div>
      )}
      {data.Result === "NO_CHANGE" && (
        <div className="mb-6 rounded-xl bg-[#edf2f7] p-3 text-center text-base text-text-gray print:hidden">
          ไม่มีการเปลี่ยนแปลง
        </div>
      )}

      <div className="mb-8 rounded-2xl border-2 border-primary-light bg-primary-light p-5 text-center">
        <div className="text-lg font-medium text-text-gray">เลขที่บิล (TicketNumber)</div>
        <div className="text-[1.8rem] font-bold text-primary">{data.TicketNumber || "-"}</div>
        {markets.length > 1 && (
          <div className="mt-1 text-base text-text-gray">บิลนี้มี {markets.length} ใบ แยกตามตลาด</div>
        )}
        <div className="mt-2 text-base text-text-gray">
          คนงานรวมทั้งคัน: <strong className="text-secondary">{data.WorkerCount} คน</strong>
        </div>
      </div>

      {data.Changes && <ChangesSummary changes={data.Changes} />}

      {markets.map((market, index) => (
        <TicketBill
          key={market.TicketNo}
          market={market}
          gateNo={data.GateNo}
          vehicle={data.Vehicle}
          breakAfter={index < markets.length - 1}
        />
      ))}

      {qrUrl && (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-white p-5">
          <div className="gate-section-title">QR สำหรับคนขับ</div>
          <QRCodeSVG value={qrUrl} size={200} marginSize={2} />
          <span className="text-base text-text-gray">ให้คนขับสแกนเพื่อติดตามสถานะรถ</span>
        </div>
      )}

      <div className="mt-10 flex gap-4 max-[500px]:flex-col print:hidden">
        <button type="button" className="gate-btn gate-btn-outline" onClick={onBack}>
          {backLabel ?? "กลับไปหน้ากรอกข้อมูล"}
        </button>
        <button type="button" className="gate-btn gate-btn-primary" onClick={() => window.print()}>
          {markets.length > 1 ? `พิมพ์ใบสรุปรายการ (${markets.length} ใบ)` : "พิมพ์ใบสรุปรายการ"}
        </button>
      </div>
    </div>
  );
}

export default TicketResult;
