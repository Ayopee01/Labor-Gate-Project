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

export interface TicketPayload {
  TicketNumber: string;
  TicketNo: string;
  TicketCreatedAt: string;
  BoothCount: number;
  MarketCode: string;
  DropoffPoint: string;
  LicensePlate: string;
  LicensePlateProvince: string;
  VehicleTypeCode: string;
  VehicleTypeName: string;
  Booths: TicketBoothPayload[];
  Dispatch: boolean;
}

export interface TicketResultProduct {
  ProductName?: string;
  PackageName?: string;
  WorkerCount?: number;
  Quantity?: number;
}

export interface TicketResultBooth {
  BoothCode?: string;
  BoothName?: string;
  Products?: TicketResultProduct[];
}

export interface TicketResult {
  Ticket?: {
    TicketNo?: string;
    Status?: string;
    LicensePlate?: string;
    LicensePlateProvince?: string;
    VehicleTypeName?: string;
    BoothCount?: number;
  };
  Market?: {
    MarketName?: string;
    MarketCode?: string;
    DropoffPoint?: string;
  };
  Booths?: TicketResultBooth[];
  TicketNumber?: string;
  WorkerCount?: number;
  Qr?: { DriverQrToken?: string };
}
