"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addScenario, removeScenario, updateScenario } from "@/lib/domain/mutations";
import { computeInputsSignature } from "@/lib/domain/signature";
import type { ComparisonSummary, ScenarioConfig, ScenarioResult, WorkspaceData } from "@/lib/domain/types";
import { validateWorkspaceData } from "@/lib/domain/validation";
import { createClient } from "@/lib/supabase/client";
import BusinessDataView from "./BusinessDataView";
import ComparisonView from "./ComparisonView";
import SimulatorView, { StaleBanner } from "./SimulatorView";
import SupplyGraphView from "./SupplyGraphView";

type Mode = "demo" | "workspace";
type TabId = "graph" | "simulator" | "comparison" | "data";

interface Simulation {
  results: ScenarioResult[];
  comparison: ComparisonSummary;
  signature: string;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "graph", label: "Jaringan Pasok" },
  { id: "simulator", label: "Simulator" },
  { id: "comparison", label: "Perbandingan" },
  { id: "data", label: "Data Usaha" },
];

const DEMO_STORAGE_KEY = "microchain:demo:v1";

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.", 0);
  }
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new ApiError(body?.error ?? "Terjadi kesalahan. Coba lagi beberapa saat.", res.status);
  return body as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

function readStoredDemo(): WorkspaceData | null {
  try {
    const raw = sessionStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? validateWorkspaceData(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export default function MicroChainWorkspace({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);
  const [running, setRunning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabId>("graph");
  const [selectedScenarioId, setSelectedScenarioId] = useState("baseline");
  const started = useRef(false);

  const simulate = useCallback(async (next: WorkspaceData) => {
    setRunning(true);
    setActionError(null);
    try {
      const res = await api<{ results: ScenarioResult[]; comparison: ComparisonSummary; inputs_signature: string }>(
        "/api/simulate/compare",
        jsonInit("POST", { snapshot: next.snapshot, scenarios: next.scenarios }),
      );
      setSim({ results: res.results, comparison: res.comparison, signature: res.inputs_signature });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Simulasi gagal dijalankan.");
    } finally {
      setRunning(false);
    }
  }, []);

  /** Pasang data hasil muat/reset lalu jalankan simulasi awal. */
  const adopt = useCallback(
    (next: WorkspaceData, id: string | null) => {
      setData(next);
      setBusinessId(id);
      setSavedJson(JSON.stringify(next));
      setSelectedScenarioId("baseline");
      setSim(null);
      void simulate(next);
    },
    [simulate],
  );

  // Muat data awal sekali saat mount.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        if (mode === "demo") {
          const stored = readStoredDemo();
          if (stored) {
            setData(stored);
            setSavedJson(JSON.stringify(stored));
            void simulate(stored);
            return;
          }
          const demo = await api<WorkspaceData>("/api/demo");
          adopt(demo, null);
        } else {
          const ws = await api<WorkspaceData & { businessId: string }>("/api/workspace");
          adopt({ snapshot: ws.snapshot, scenarios: ws.scenarios }, ws.businessId);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(err instanceof Error ? err.message : "Gagal memuat data.");
      }
    })();
  }, [mode, adopt, simulate, router]);

  // Mode tamu: simpan perubahan di sessionStorage.
  useEffect(() => {
    if (mode !== "demo" || !data) return;
    try {
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* penyimpanan sesi tidak tersedia: abaikan */
    }
  }, [mode, data]);

  const currentJson = useMemo(() => (data ? JSON.stringify(data) : null), [data]);
  const dirty = mode === "workspace" && currentJson !== null && currentJson !== savedJson;

  // Peringatan sebelum meninggalkan halaman dengan perubahan belum tersimpan.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const currentSignature = useMemo(
    () => (data ? computeInputsSignature(data.snapshot, data.scenarios) : null),
    [data],
  );
  const isStale = !!sim && currentSignature !== sim.signature;

  const change = useCallback((next: WorkspaceData) => {
    setData(next);
    setNotice(null);
  }, []);

  async function save() {
    if (!data || !businessId) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await api<WorkspaceData & { ok: boolean }>(
        "/api/workspace",
        jsonInit("PUT", { businessId, snapshot: data.snapshot, scenarios: data.scenarios }),
      );
      const saved = { snapshot: res.snapshot, scenarios: res.scenarios };
      setSavedJson(JSON.stringify(saved));
      setData(saved);
      setNotice("Perubahan tersimpan di workspace Anda.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return router.replace("/login");
      setActionError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setConfirmReset(false);
    setBusy(true);
    setActionError(null);
    try {
      if (mode === "demo") {
        const demo = await api<WorkspaceData>("/api/demo");
        try {
          sessionStorage.removeItem(DEMO_STORAGE_KEY);
        } catch {
          /* abaikan */
        }
        adopt(demo, null);
      } else {
        const ws = await api<WorkspaceData & { businessId: string }>("/api/workspace/reset", { method: "POST" });
        adopt({ snapshot: ws.snapshot, scenarios: ws.scenarios }, ws.businessId);
      }
      setNotice("Data dikembalikan ke kondisi awal Dapur Sari.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return router.replace("/login");
      setActionError(err instanceof Error ? err.message : "Gagal mereset data.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace("/");
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <p role="alert" className="rounded-lg bg-danger-tint px-4 py-3 text-danger">{loadError}</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-brand underline underline-offset-2">Kembali ke beranda</Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-ink-muted" role="status" aria-live="polite">
        Memuat data Dapur Sari...
      </div>
    );
  }

  const scenario: ScenarioConfig = data.scenarios.find((s) => s.id === selectedScenarioId) ?? data.scenarios[0];
  const result = sim?.results.find((r) => r.scenario_id === scenario.id);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-ink text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold tracking-tight">MicroChain</Link>
            <span className="text-sm text-white/80">{data.snapshot.business.name}</span>
            <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-semibold">
              {mode === "demo" ? "Mode tamu" : "Workspace"}
            </span>
            {dirty && <span className="rounded bg-warn px-2 py-0.5 text-xs font-semibold">Belum disimpan</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "workspace" && (
              <button
                type="button"
                onClick={save}
                disabled={!dirty || busy}
                className="min-h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
              >
                Simpan ke Workspace
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={busy}
              className="min-h-10 rounded-md border border-white/40 px-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
            >
              Reset ke Data Awal
            </button>
            {mode === "workspace" ? (
              <button type="button" onClick={logout} className="min-h-10 rounded-md px-3 text-sm font-semibold hover:bg-white/10">
                Keluar
              </button>
            ) : (
              <Link href="/login" className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold hover:bg-white/10">
                Masuk untuk menyimpan
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-6 sm:px-6">
        {mode === "demo" && (
          <p className="text-sm text-ink-muted">
            Mode tamu: perubahan hanya tersimpan di browser ini dan hilang saat sesi ditutup.
          </p>
        )}

        {confirmReset && (
          <div role="alertdialog" aria-label="Konfirmasi reset" className="rounded-lg border border-danger bg-danger-tint px-4 py-3">
            <p className="font-semibold text-danger">Kembalikan semua data dan skenario ke kondisi awal Dapur Sari?</p>
            <p className="mt-1 text-sm text-ink">Perubahan Anda{mode === "workspace" ? " di workspace" : ""} akan hilang.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={reset} className="min-h-10 rounded-md bg-danger px-4 text-sm font-semibold text-white">
                Ya, Reset
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="min-h-10 rounded-md border border-line bg-paper px-4 text-sm font-semibold">
                Batal
              </button>
            </div>
          </div>
        )}

        {notice && <p role="status" className="rounded-lg bg-brand-tint px-4 py-2 text-sm text-brand-strong">{notice}</p>}
        {actionError && <p role="alert" className="rounded-lg bg-danger-tint px-4 py-2 text-sm text-danger">{actionError}</p>}
        {isStale && <StaleBanner onRun={() => void simulate(data)} running={running} />}

        <div role="tablist" aria-label="Bagian aplikasi" className="flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold ${
                tab === t.id ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {running && !sim && <p className="text-ink-muted" role="status">Menghitung simulasi...</p>}
          {tab === "graph" && <SupplyGraphView snapshot={data.snapshot} scenario={scenario} result={result} />}
          {tab === "simulator" && (
            <SimulatorView
              snapshot={data.snapshot}
              scenarios={data.scenarios}
              selectedId={scenario.id}
              onSelect={setSelectedScenarioId}
              onChange={(next) => change(updateScenario(data, next))}
              onAdd={() => {
                const n = data.scenarios.length - 2;
                const next = addScenario(data, scenario.id, `Skenario ${n}`);
                change(next);
                setSelectedScenarioId(next.scenarios.at(-1)?.id ?? scenario.id);
              }}
              onRemove={(id) => {
                change(removeScenario(data, id));
                setSelectedScenarioId("baseline");
              }}
              onRun={() => void simulate(data)}
              results={sim?.results ?? null}
              isStale={isStale}
              running={running}
              showBanner={false}
            />
          )}
          {tab === "comparison" && (
            <ComparisonView
              snapshot={data.snapshot}
              scenarios={data.scenarios}
              results={sim?.results ?? null}
              comparison={sim?.comparison ?? null}
              isStale={isStale}
            />
          )}
          {tab === "data" && <BusinessDataView data={data} onChange={change} />}
        </div>
      </main>
    </div>
  );
}
