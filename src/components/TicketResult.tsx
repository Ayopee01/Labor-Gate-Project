"use client";

import type { TicketBatchResponse, TicketResult as TicketResultData } from "@/types/gate";

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
    <div className={`flex items-center justify-between ${bordered ? "border-t border-dashed border-border pt-3" : ""}`}>
      <span>{label}</span>
      <strong className={emphasize ? "text-[1.15rem] text-text-dark" : "text-[1.05rem] text-text-dark"}>{value}</strong>
    </div>
  );
}

function TicketBill({ data, breakAfter }: { data: TicketResultData; breakAfter: boolean }) {
  const ticket = data.Ticket ?? {};
  const market = data.Market ?? {};
  const booths = data.Booths ?? [];
  const qrToken = data.Qr?.DriverQrToken;

  return (
    <div className={breakAfter ? "gate-ticket-page-break" : undefined}>
      <div className="mb-8 flex flex-col gap-3 rounded-2xl border-2 border-border p-5 text-lg">
        <InfoRow label="ตลาด:" value={market.MarketName ? `${market.MarketName} (${market.MarketCode ?? ""})` : "-"} />
        <InfoRow label="จุดจอดส่งสินค้า:" value={market.DropoffPoint || "-"} bordered emphasize />
        <InfoRow label="เลขที่ใบ (TicketNo):" value={ticket.TicketNo || "-"} bordered emphasize />
        <InfoRow label="สถานะ:" value={ticket.Status || "-"} bordered emphasize />
        <InfoRow
          label="รถขนส่ง:"
          value={`${ticket.LicensePlate || "-"} (${ticket.LicensePlateProvince || "-"}) · ${ticket.VehicleTypeName || "-"}`}
          bordered
        />
      </div>

      <div className="mb-8">
        <div className="gate-section-title">รายการสินค้าที่บันทึก</div>
        <div className="flex flex-col gap-3">
          {booths.map((booth, bi) => (
            <div key={bi}>
              <div className="mt-2 border-b border-dashed border-border pb-1 text-lg font-semibold text-primary first:mt-0">
                แผง {booth.BoothCode ?? ""}
                {booth.BoothName ? ` - ${booth.BoothName}` : ""}
              </div>
              {(booth.Products ?? []).map((p, pi) => (
                <div
                  key={pi}
                  className="mt-3 grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-border bg-[#f8fafc] p-5"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="text-xl font-semibold text-text-dark">{p.ProductName ?? ""}</div>
                    <div className="text-lg text-text-gray">แพ็กเกจ: {p.PackageName ?? ""}</div>
                    <div className="mt-1.5">
                      <span className="inline-block rounded-md bg-secondary-light px-2.5 py-1 text-[0.95rem] font-medium text-secondary">
                        ใช้คนงาน: {p.WorkerCount ?? 0} คน
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-2xl font-bold text-primary">
                    {(p.Quantity ?? 0).toLocaleString()}{" "}
                    <span className="text-base font-medium text-text-gray">ชิ้น</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="gate-section-title">สรุปการจัดสรรแรงงาน</div>
        <div className="mt-4 grid grid-cols-2 gap-5 max-[500px]:grid-cols-1">
          <div className="rounded-[20px] border border-[rgba(211,47,47,0.1)] bg-primary-light p-6 text-center">
            <div className="mb-2 text-lg font-medium text-text-gray">จำนวนแผงทั้งหมด</div>
            <div className="text-[2.2rem] font-bold text-primary">{ticket.BoothCount ?? booths.length}</div>
          </div>
          <div className="rounded-[20px] border border-[rgba(46,125,50,0.1)] bg-secondary-light p-6 text-center">
            <div className="mb-2 text-lg font-medium text-text-gray">คนงานที่ต้องใช้ทั้งหมด</div>
            <div className="text-[2.2rem] font-bold text-secondary">{data.WorkerCount ?? 0}</div>
          </div>
        </div>
      </div>

      {qrToken && (
        <div className="mb-8">
          <div className="gate-section-title">QR สำหรับคนขับ</div>
          <div className="break-all rounded-2xl border-2 border-border bg-white p-5 font-mono text-sm">{qrToken}</div>
        </div>
      )}
    </div>
  );
}

interface TicketResultProps {
  data: TicketBatchResponse;
  onBack: () => void;
}

function TicketResult({ data, onBack }: TicketResultProps) {
  const results = data.Results ?? [];

  return (
    <div className="gate-card">
      <div className="gate-header">
        <h2>สรุปรายการสำเร็จ</h2>
        <p>รายละเอียดข้อมูลที่บันทึกเข้าระบบ</p>
      </div>

      <div className="mb-8 rounded-2xl border-2 border-primary-light bg-primary-light p-5 text-center">
        <div className="text-lg font-medium text-text-gray">เลขที่บิล (TicketNumber)</div>
        <div className="text-[1.8rem] font-bold text-primary">{data.TicketNumber || "-"}</div>
        {results.length > 1 && (
          <div className="mt-1 text-base text-text-gray">บิลนี้มี {results.length} ใบ แยกตามตลาด</div>
        )}
      </div>

      {results.map((result, index) => (
        <TicketBill key={index} data={result} breakAfter={index < results.length - 1} />
      ))}

      <div className="mt-10 flex gap-4 max-[500px]:flex-col">
        <button type="button" className="gate-btn gate-btn-outline" onClick={onBack}>
          กลับไปหน้ากรอกข้อมูล
        </button>
        <button type="button" className="gate-btn gate-btn-primary" onClick={() => window.print()}>
          {results.length > 1 ? `พิมพ์ใบสรุปรายการ (${results.length} ใบ)` : "พิมพ์ใบสรุปรายการ"}
        </button>
      </div>
    </div>
  );
}

export default TicketResult;
