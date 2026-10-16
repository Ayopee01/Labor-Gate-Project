"use client";

import { useEffect, useMemo, useState } from "react";
import type { GateBooth, GateMarket, GateProduct } from "@/types/gate";

export interface GateOption {
  value: string;
  label: string;
}

// โหลด options ของ Gate (ตลาด/สินค้า) ตอนเปิดหน้า และโหลดรายการแผงของทุกตลาดที่ถูกเลือกอยู่
// แบบแคชต่อตลาด (คนละตลาดมีรายการแผงคนละชุด) ใช้ร่วมกันทั้งหน้าออกตั๋วและหน้าแก้ไขตั๋ว
export function useGateOptions(selectedMarketCodes: string[]) {
  const [markets, setMarkets] = useState<GateMarket[]>([]);
  const [products, setProducts] = useState<GateProduct[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState(false);

  const [boothOptionsByMarket, setBoothOptionsByMarket] = useState<Record<string, GateBooth[]>>({});
  const [boothsLoadingSet, setBoothsLoadingSet] = useState<Set<string>>(new Set());
  const [boothsErrorSet, setBoothsErrorSet] = useState<Set<string>>(new Set());

  const activeMarketCodes = useMemo(
    () => Array.from(new Set(selectedMarketCodes.filter(Boolean))),
    [selectedMarketCodes],
  );
  const activeMarketCodesKey = activeMarketCodes.join(",");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/options");
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setProducts(data.Products || []);
        setMarkets(data.Markets || []);
      } catch (e) {
        console.warn("Could not load options from backend API", e);
        if (!cancelled) setOptionsError(true);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // โหลดรายการแผง (Booths) ของทุกตลาดที่ถูกเลือกอยู่ตอนนี้ แต่ยังไม่เคยโหลด/กำลังโหลดอยู่
  useEffect(() => {
    const toFetch = activeMarketCodes.filter(
      (code) => !(code in boothOptionsByMarket) && !boothsLoadingSet.has(code),
    );
    if (toFetch.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoothsLoadingSet((prev) => new Set([...prev, ...toFetch]));
    toFetch.forEach((code) => {
      (async () => {
        try {
          const res = await fetch(`/api/options?MarketCode=${encodeURIComponent(code)}`);
          if (!res.ok) throw new Error(`Error ${res.status}`);
          const data = await res.json();
          setBoothOptionsByMarket((prev) => ({ ...prev, [code]: data.Booths || [] }));
        } catch (e) {
          console.warn("Could not load booths for market", code, e);
          setBoothOptionsByMarket((prev) => ({ ...prev, [code]: [] }));
          setBoothsErrorSet((prev) => new Set([...prev, code]));
        } finally {
          setBoothsLoadingSet((prev) => {
            const next = new Set(prev);
            next.delete(code);
            return next;
          });
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMarketCodesKey]);

  const marketOptions: GateOption[] = markets.map((m) => ({
    value: m.MarketCode,
    label: `${m.MarketName} (${m.MarketCode})`,
  }));

  const marketPlaceholder = optionsLoading
    ? "-- กำลังโหลดข้อมูลตลาด --"
    : optionsError
      ? "-- ไม่สามารถโหลดข้อมูลตลาดได้ --"
      : marketOptions.length === 0
        ? "-- ไม่พบข้อมูลตลาด --"
        : "-- เลือกตลาด --";

  function boothOptionsFor(marketCode: string): GateOption[] {
    return (boothOptionsByMarket[marketCode] ?? []).map((b) => ({
      value: b.BoothCode,
      label: `${b.BoothName ?? ""} (${b.BoothCode})`.trim(),
    }));
  }

  function isBoothsLoading(marketCode: string): boolean {
    return boothsLoadingSet.has(marketCode);
  }

  function boothPlaceholderFor(marketCode: string): string {
    if (!marketCode) return "-- กรุณาเลือกตลาดก่อน --";
    if (boothsErrorSet.has(marketCode)) return "-- ไม่สามารถโหลดข้อมูลแผงได้ --";
    const loaded = boothOptionsByMarket[marketCode];
    if ((loaded?.length ?? 0) === 0 && !boothsLoadingSet.has(marketCode)) {
      return "-- ไม่พบแผงที่ใช้งานได้ในตลาดนี้ --";
    }
    return "-- เลือกแผง --";
  }

  return {
    products,
    marketOptions,
    optionsLoading,
    marketPlaceholder,
    boothOptionsFor,
    isBoothsLoading,
    boothPlaceholderFor,
  };
}
