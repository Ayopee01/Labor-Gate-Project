import type { GateErrorBody } from "@/types/gate";

// fix = ผู้ใช้แก้ข้อมูลเองได้, admin = ต้องให้ Admin แก้ master data, retry = ลองส่งใหม่ (ใช้เลขเดิม)
export type GateErrorKind = "fix" | "admin" | "retry";

export interface GateErrorInfo {
  status?: number;
  code?: string;
  message: string;
  detail?: string;
  requestId?: string;
  boothCodes?: string[];
  kind: GateErrorKind;
}

// รับได้ทั้ง key ตัวเล็ก (ตาม docsgate.md) และ PascalCase (ที่ backend ตอบจริง)
export function normalizeGateError(raw: unknown): GateErrorBody {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T>(...keys: string[]) => keys.map((k) => body[k]).find((v) => v !== undefined && v !== null) as T | undefined;
  return {
    statusCode: pick<number>("statusCode", "StatusCode"),
    code: pick<string>("code", "Code"),
    message: pick<string>("message", "Message"),
    request_id: pick<string>("request_id", "RequestId", "requestId"),
    ticketNo: pick<string>("ticketNo", "TicketNo"),
    boothCodes: pick<string[]>("boothCodes", "BoothCodes"),
  };
}

const ERROR_MESSAGES: Record<string, { message: string; kind: GateErrorKind }> = {
  VALIDATION_ERROR: { message: "ข้อมูลที่ส่งไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง", kind: "fix" },
  INVALID_TICKET_NO: { message: "เลขที่ใบ (TicketNo) ต้องเป็นตัวเลข 14 หลัก", kind: "fix" },
  GATE_AUTH_REQUIRED: { message: "ไม่ได้ส่งข้อมูลยืนยันตัวตนของ Gate", kind: "admin" },
  INVALID_GATE_CREDENTIALS: { message: "ClientId/ClientSecret ของ Gate ไม่ถูกต้อง", kind: "admin" },
  GATE_TICKET_NOT_FOUND: { message: "ไม่พบตั๋ว หรือตั๋วถูกยกเลิกไปแล้ว", kind: "fix" },
  GATE_TICKET_ALREADY_EXISTS: { message: "เลขที่ใบนี้ยังใช้งานอยู่ หากต้องการแก้ไขให้ใช้เมนูแก้ไขตั๋ว", kind: "fix" },
  GATE_TRANSACTION_REF_PAYLOAD_MISMATCH: {
    message: "ข้อมูลไม่ตรงกับคำขอเดิม กรุณากดส่งใหม่อีกครั้ง",
    kind: "retry",
  },
  GATE_REQUEST_RESPONSE_NOT_READY: { message: "ระบบกำลังประมวลผลคำขอเดิมอยู่ กรุณารอสักครู่แล้วกดส่งอีกครั้ง", kind: "retry" },
  MARKET_BOOTH_NOT_FOUND: { message: "ไม่พบแผงในตลาดนี้ หรือแผงไม่ได้เปิดใช้งาน กรุณาแจ้ง Admin", kind: "admin" },
  MARKET_NAME_NOT_CONFIGURED: { message: "ตลาดยังไม่ได้ตั้งชื่อในระบบ กรุณาแจ้ง Admin", kind: "admin" },
  WORKER_REQUIREMENT_NOT_FOUND: { message: "คำนวณจำนวนคนงานจากสินค้าไม่ได้ กรุณาแจ้ง Admin", kind: "admin" },
  BOOTH_VENDOR_LINE_NOT_CONFIGURED: { message: "แผงยังไม่ได้ตั้งค่า LINE ของ Vendor กรุณาแจ้ง Admin", kind: "admin" },
  BOOTH_ALREADY_SUBMITTED: { message: "มีแผงที่ส่งยอดแล้ว ไม่สามารถแก้ไขหรือลบได้", kind: "fix" },
  TICKET_VERSION_CONFLICT: { message: "ข้อมูลตั๋วถูกแก้ไขโดยผู้อื่น ระบบโหลดข้อมูลล่าสุดแล้ว กรุณาตรวจสอบอีกครั้ง", kind: "fix" },
  GATE_TICKET_CLOSED: { message: "ตั๋วนี้ปิดงานแล้ว แก้ไขไม่ได้", kind: "fix" },
  VEHICLE_JOB_CLOSED: { message: "งานของรถคันนี้ปิดแล้ว แก้ไขไม่ได้", kind: "fix" },
  TICKET_NO_AMBIGUOUS: { message: "มีตั๋วที่ใช้เลขนี้มากกว่า 1 ใบ กรุณาแจ้ง Admin", kind: "admin" },
  GATE_UNREACHABLE: { message: "เชื่อมต่อ Gate backend ไม่ได้ กรุณากดส่งอีกครั้ง", kind: "retry" },
};

export function toGateErrorInfo(status: number | undefined, body: GateErrorBody | null | undefined): GateErrorInfo {
  const code = body?.code;
  const known = code ? ERROR_MESSAGES[code] : undefined;
  return {
    status,
    code,
    message: known?.message ?? body?.message ?? `เกิดข้อผิดพลาด (HTTP ${status ?? "-"})`,
    detail: known && body?.message ? body.message : undefined,
    requestId: body?.request_id,
    boothCodes: body?.boothCodes,
    kind: known?.kind ?? (status && status >= 500 ? "retry" : "fix"),
  };
}

export async function readGateError(res: Response): Promise<GateErrorInfo> {
  return toGateErrorInfo(res.status, normalizeGateError(await res.json().catch(() => null)));
}

export function networkErrorInfo(error: unknown): GateErrorInfo {
  return {
    message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณากดส่งอีกครั้ง (ระบบจะใช้เลขที่ใบเดิม ไม่ออกซ้ำ)",
    detail: error instanceof Error ? error.message : String(error),
    kind: "retry",
  };
}

export function clientErrorInfo(message: string): GateErrorInfo {
  return { message, kind: "fix" };
}
