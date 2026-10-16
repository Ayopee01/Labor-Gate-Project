export interface GatePackage {
  PackageCode?: string;
  PackageName?: string;
}

export interface GateProduct {
  ProductCode?: string;
  ProductName?: string;
  Packages?: GatePackage[];
}

export interface GateMarket {
  MarketCode: string;
  MarketName: string;
}

export interface GateBooth {
  BoothCode: string;
  BoothName?: string;
}

export interface GateOptionsResponse {
  Products?: GateProduct[];
  Markets?: GateMarket[];
  Booths?: GateBooth[];
}

export interface TicketItemPayload {
  ProductCode: string;
  PackageCode: string;
  Quantity: number;
}

export interface TicketBoothPayload {
  BoothCode: string;
  Products: TicketItemPayload[];
}

// ---------- Request ที่ส่งไป Backend (POST /api/gate/tickets) ----------
// 1 request = 1 รถ ทุกตลาดอยู่ใน Markets[] และบันทึกใน transaction เดียว

export interface GateTicketMarketRequest {
  TicketNo: string;
  TicketCreatedAt: string;
  MarketCode: string;
  DropoffPoint: string;
  Booths: TicketBoothPayload[];
}

export interface GateTicketRequest {
  TicketNumber: string;
  GateNo: string;
  LicensePlate: string;
  LicensePlateProvince: string;
  VehicleTypeCode: string;
  VehicleTypeName: string;
  Markets: GateTicketMarketRequest[];
  Dispatch: boolean;
  IdempotencyKey?: string;
}

// ---------- Request จาก client → /api/tickets (proxy) ----------
// client ส่งแค่โครงร่างต่อตลาด ส่วน TicketNumber/TicketNo/TicketCreatedAt/GateNo ตัวจริงถูกกำหนดที่ proxy
// TicketNumber ส่งมาเฉพาะตอน "เพิ่มตั๋วให้รถคันเดิม" เท่านั้น

export interface TicketDraftMarket {
  MarketCode: string;
  DropoffPoint: string;
  Booths: TicketBoothPayload[];
}

export interface TicketCreateDraft {
  TicketNumber?: string;
  IdempotencyKey: string;
  LicensePlate: string;
  LicensePlateProvince: string;
  VehicleTypeCode: string;
  VehicleTypeName: string;
  Markets: TicketDraftMarket[];
  Dispatch: boolean;
}

// ---------- Request ของ PUT /api/gate/tickets/{ticketNo} ----------

export interface GateTicketUpdateRequest {
  GateNo: string;
  Version?: string;
  MarketCode: string;
  DropoffPoint: string;
  Booths: TicketBoothPayload[];
}

export type TicketUpdateDraft = Omit<GateTicketUpdateRequest, "GateNo">;

// ---------- Response ----------

export type GateTicketResultCode = "CREATED" | "REPLAYED" | "UPDATED" | "NO_CHANGE";

export interface GateTicketResponseProduct {
  ProductCode: string;
  ProductFullCode?: string;
  ProductName: string;
  PackageCode: string;
  PackageName: string;
  Quantity: number;
  WorkerCount: number;
}

export interface GateTicketResponseBooth {
  BoothCode: string;
  BoothName?: string | null;
  Products: GateTicketResponseProduct[];
}

export interface GateTicketResponseMarket {
  TicketNo: string;
  TicketCreatedAt: string;
  MarketCode: string;
  MarketName: string;
  DropoffPoint?: string | null;
  BoothCount: number;
  WorkerCount: number;
  Booths: GateTicketResponseBooth[];
}

export interface GateVehicle {
  LicensePlate: string;
  LicensePlateProvince?: string | null;
  VehicleTypeCode?: string | null;
  VehicleTypeName?: string | null;
  // POST/PUT: unload_now / waiting_unload — GET: WAIT / WORKING / RELEASED / COMPLETED / CANCELLED
  Status: string;
}

export interface GateQr {
  DriverQrToken?: string;
  DriverQrUrl?: string;
}

export interface GateTicketChanges {
  MarketChanged: boolean;
  DropoffPointChanged: boolean;
  Added: string[];
  Removed: string[];
  Updated: string[];
  Unchanged: string[];
  PreviousWorkerCount: number;
  WorkerCount: number;
}

export interface GateTicketResponse {
  Result: GateTicketResultCode;
  TicketNumber: string;
  GateNo: string;
  Vehicle: GateVehicle;
  Markets: GateTicketResponseMarket[];
  WorkerCount: number;
  Qr: GateQr;
  Changes?: GateTicketChanges;
  ServerTime?: string;
}

export interface GateTicketDetailBooth extends GateTicketResponseBooth {
  Status: string;
  Editable: boolean;
  LockReason: string | null;
}

export interface GateTicketDetailResponse {
  TicketNumber: string;
  GateNo?: string | null;
  Version: string;
  Vehicle: GateVehicle;
  Market: Omit<GateTicketResponseMarket, "Booths"> & {
    Status: string;
    MarketEditable: boolean;
    Booths: GateTicketDetailBooth[];
  };
  WorkerCount: number;
  Qr: GateQr;
}

// รูปแบบ error ที่ proxy ส่งให้ client (key ตัวเล็กตาม docsgate.md) — backend จริงตอบเป็น PascalCase
// (Code, Message, RequestId, …) proxy จึง normalize ให้ด้วย normalizeGateError ก่อนส่งต่อ
export interface GateErrorBody {
  statusCode?: number;
  code?: string;
  message?: string;
  request_id?: string;
  ticketNo?: string;
  boothCodes?: string[];
}
