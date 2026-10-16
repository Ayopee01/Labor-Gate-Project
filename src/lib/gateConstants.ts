// ค่าคงที่สำหรับการทดสอบ — Gate ช่องเดียว และข้อมูลรถคงที่ ใช้ได้ทั้งฝั่ง client (JSON Preview) และ server
export const GATE_NO = "G01";

export const DEFAULT_DROPOFF_POINT = "Gate 1 - Zone A";

export const TEST_VEHICLE = {
  LicensePlate: "กก 99",
  LicensePlateProvince: "กรุงเทพ",
  VehicleTypeCode: "PICKUP",
  VehicleTypeName: "Pickup truck",
} as const;

export const TICKET_NO_PATTERN = /^\d{14}$/;
