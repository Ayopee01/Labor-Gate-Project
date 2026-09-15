# Gate Demo

Web Application สำหรับ Gate Ticket โดย user เลือก Market Booth Product Package Quality แล้วระบบจะส่งข้อมูลไปยัง Backend Gate API พร้อมออก ticket number อัตโนมัติ

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- react-select สำหรับ form selection
- Upstash Redis สำหรับ atomic counter ของ ticket number

## Project Structure

```
src/
  app/
    page.tsx              หน้าแรก (ฟอร์มออก Ticket)
    api/options/           ดึงรายการ Market/Booth/Product จาก Backend
    api/ticket-number/      preview ticket number ถัดไป (read-only)
    api/tickets/            ส่งข้อมูลออกใบจริง (claim ticket number แบบ atomic)
  components/
    GateForm.tsx            ฟอร์มหลักสำหรับกรอกข้อมูล
    TicketResult.tsx         หน้าแสดงผลลัพธ์หลังออกใบสำเร็จ
  lib/gatePayload.ts        สร้างและตรวจสอบ payload ก่อนส่ง
  types/                     type ของข้อมูล Gate และฟอร์ม
```

## Setup

คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่า:

| Variable | Description |
| --- | --- |
| `GATE_BASE_URL` | URL ของ Backend Gate API |
| `GATE_CLIENT_ID` / `GATE_CLIENT_SECRET` | credential สำหรับ Basic Auth กับ Backend |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | เชื่อมต่อ Upstash Redis สำหรับ counter ของ ticket number กัน number ซ้ำเวลามีหลาย client ใช้งานพร้อมกัน |

## Usage

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

คำสั่งอื่น: `npm run build` (build production), `npm run start` (start production build), `npm run lint` (lint โค้ด)
