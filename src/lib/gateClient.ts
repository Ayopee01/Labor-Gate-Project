import { NextResponse } from "next/server";
import { normalizeGateError } from "@/lib/gateErrors";
import type { GateErrorBody } from "@/types/gate";

export interface GateFetchResult {
  status: number;
  body: unknown;
  requestId: string | null;
}

function getGateConfig() {
  const baseUrl = process.env.GATE_BASE_URL;
  const clientId = process.env.GATE_CLIENT_ID;
  const clientSecret = process.env.GATE_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error("Missing required env var: GATE_BASE_URL, GATE_CLIENT_ID or GATE_CLIENT_SECRET");
  }

  return {
    baseUrl,
    authHeader: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
  };
}

// ยิงไป Gate backend พร้อม Basic Auth แล้วคืน status + body ตามจริง (ไม่โยน error ตาม status)
// เพื่อให้ route ส่งต่อ error ของ backend (code, boothCodes, request_id) กลับไปที่ client ได้ครบ
export async function gateFetch(
  path: string,
  init: { method?: string; body?: unknown; searchParams?: Record<string, string> } = {},
): Promise<GateFetchResult> {
  const { baseUrl, authHeader } = getGateConfig();
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(init.searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        Authorization: authHeader,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    const text = await res.text();
    let body: unknown = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { statusCode: res.status, message: text } satisfies GateErrorBody;
      }
    }
    return { status: res.status, body, requestId: res.headers.get("x-request-id") };
  } catch (error) {
    console.error(`Gate request failed: ${init.method ?? "GET"} ${path}`, error);
    const body: GateErrorBody = {
      statusCode: 502,
      code: "GATE_UNREACHABLE",
      message: error instanceof Error ? error.message : "Cannot reach Gate backend",
    };
    return { status: 502, body, requestId: null };
  }
}

export function gateErrorCode(result: GateFetchResult): string | undefined {
  return result.status >= 400 ? normalizeGateError(result.body).code : undefined;
}

export function toNextResponse(result: GateFetchResult): NextResponse {
  if (result.status < 400) {
    return NextResponse.json(result.body, { status: result.status });
  }
  // error ส่งต่อเป็นรูปแบบเดียว (key ตัวเล็ก) และแนบ request_id จาก header เผื่อ body ไม่มี จะได้แจ้งทีม Backend ได้เสมอ
  const error = normalizeGateError(result.body);
  const body: GateErrorBody = {
    ...error,
    statusCode: error.statusCode ?? result.status,
    request_id: error.request_id ?? result.requestId ?? undefined,
  };
  return NextResponse.json(body, { status: result.status });
}

export function proxyError(status: number, code: string, message: string): NextResponse {
  const body: GateErrorBody = { statusCode: status, code, message };
  return NextResponse.json(body, { status });
}
