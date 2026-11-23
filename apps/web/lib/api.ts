import type { ComparisonResult, DemoData, NetworkResult, Scenario, SimulationResult, Snapshot } from "./types";

const apiOrigin = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

function describeError(body: { detail?: unknown } | null, status: number) {
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) {
    return body.detail.map((issue: { msg?: string }) => issue.msg).filter(Boolean).join(". ") || "Periksa kembali data simulasi.";
  }
  return `Layanan mengembalikan kesalahan (${status}). Coba lagi.`;
}

async function request<T>(path: string, signal?: AbortSignal, payload?: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiOrigin}/api/v1/${path}`, {
      signal,
      cache: "no-store",
      ...(payload ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("API Pasok-Siaga belum dapat dihubungi. Periksa koneksi lalu coba lagi.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(describeError(data, response.status));
  if (data === null) throw new Error("Layanan mengembalikan respons yang tidak dapat dibaca.");
  return data as T;
}

export const getDemo = (signal?: AbortSignal) => request<DemoData>("demo", signal);
export const analyzeNetwork = (snapshot: Snapshot, scenario: Scenario, signal?: AbortSignal) =>
  request<NetworkResult>("network/analyze", signal, { snapshot, scenario });
export const preview = (snapshot: Snapshot, scenario: Scenario, signal?: AbortSignal) =>
  request<SimulationResult>("simulations/preview", signal, { snapshot, scenario });
export const compare = (snapshot: Snapshot, scenarios: Scenario[], signal?: AbortSignal) =>
  request<ComparisonResult>("simulations/compare", signal, { snapshot, scenarios });
