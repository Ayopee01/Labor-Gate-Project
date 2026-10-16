"use client";

import { useState } from "react";
import GateForm from "@/components/GateForm";
import TicketEditor from "@/components/TicketEditor";

const TABS = [
  { id: "create", label: "ออกตั๋ว" },
  { id: "edit", label: "ค้นหา / แก้ไขตั๋ว" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Page() {
  const [tab, setTab] = useState<TabId>("create");

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-6 flex w-full max-w-[650px] gap-3 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`gate-btn ${tab === t.id ? "gate-btn-primary" : "gate-btn-outline"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ซ่อนแทนการ unmount เพื่อให้ฟอร์มที่กรอกค้างไว้ไม่หายเวลาสลับแท็บ */}
      <div className={tab === "create" ? "contents" : "hidden"}>
        <GateForm />
      </div>
      <div className={tab === "edit" ? "contents" : "hidden"}>
        <TicketEditor />
      </div>
    </div>
  );
}

export default Page;
