// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAPUR_SARI_FALLBACK_FIXTURE } from "@/lib/domain/fixture";
import { computeInputsSignature } from "@/lib/domain/signature";
import { compareScenarios } from "@/lib/solver/compare";

vi.mock("@/components/workspace/SupplyGraphCanvas", () => ({ default: () => <div data-testid="graph-canvas" /> }));
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: vi.fn().mockResolvedValue({}) } }) }));

import MicroChainWorkspace from "@/components/workspace/MicroChainWorkspace";

const fixture = () => structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
const BUSINESS_ID = "11111111-1111-4111-8111-111111111111";

type Handler = (url: string, init?: RequestInit) => Promise<Response> | Response;
let calls: { url: string; method: string; body?: unknown }[];
let workspaceStatus = 200;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const handler: Handler = async (url, init) => {
  const method = init?.method ?? "GET";
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  calls.push({ url, method, body });
  if (url === "/api/demo") return json(fixture());
  if (url === "/api/simulate/compare") {
    const { results, comparison } = await compareScenarios(body.snapshot, body.scenarios);
    return json({ results, comparison, inputs_signature: computeInputsSignature(body.snapshot, body.scenarios) });
  }
  if (url === "/api/workspace" && method === "GET")
    return workspaceStatus === 401 ? json({ error: "Anda belum masuk." }, 401) : json({ businessId: BUSINESS_ID, ...fixture() });
  if (url === "/api/workspace" && method === "PUT") return json({ ok: true, snapshot: body.snapshot, scenarios: body.scenarios });
  if (url === "/api/workspace/reset") return json({ businessId: BUSINESS_ID, ...fixture() });
  return json({ error: "tidak ditemukan" }, 404);
};

const countCalls = (url: string) => calls.filter((c) => c.url === url).length;
const STALE = /hasil simulasi sebelumnya sudah basi/i;

beforeEach(() => {
  calls = [];
  workspaceStatus = 200;
  replace.mockReset();
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => Promise.resolve(handler(url, init))));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openTab(name: string) {
  await userEvent.click(screen.getByRole("tab", { name }));
}

async function renderDemo() {
  render(<MicroChainWorkspace mode="demo" />);
  await screen.findByRole("tab", { name: "Perbandingan" });
  await waitFor(() => expect(countCalls("/api/simulate/compare")).toBe(1));
}

describe("MicroChainWorkspace (demo)", () => {
  it("loads Dapur Sari and runs the initial simulation automatically without a stale banner", async () => {
    await renderDemo();
    expect(countCalls("/api/demo")).toBe(1);
    await openTab("Perbandingan");
    expect(await screen.findByText("+Rp 132.000")).toBeInTheDocument();
    expect(screen.queryByText(STALE)).not.toBeInTheDocument();
  });

  it("shows recovered contribution in Rupiah and percent on the comparison tab", async () => {
    await renderDemo();
    await openTab("Perbandingan");
    const kpi = within(await screen.findByRole("region", { name: "Ringkasan pemulihan" }));
    expect(kpi.getByText("+Rp 132.000")).toBeInTheDocument();
    expect(kpi.getByText(/55%/)).toBeInTheDocument();
    expect(kpi.getByText(/76%/)).toBeInTheDocument();
    expect(kpi.getByText("Rp 240.000")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Perbandingan skenario" });
    expect(within(table).getByText("Rp 450.000")).toBeInTheDocument();
    expect(within(table).getByText("Rp 210.000")).toBeInTheDocument();
    expect(within(table).getByText("Rp 342.000")).toBeInTheDocument();
  });

  it("marks results stale as soon as an input changes, then recalculates and clears the banner", async () => {
    await renderDemo();
    await openTab("Data Usaha");
    const stock = screen.getByLabelText("Stok Tepung terigu (g)");
    await userEvent.clear(stock);
    await userEvent.type(stock, "9000");

    expect(await screen.findByText(STALE)).toBeInTheDocument();
    expect(countCalls("/api/simulate/compare")).toBe(1); // tidak auto-solve di tiap ketikan

    await userEvent.click(screen.getByRole("button", { name: "Jalankan Ulang Simulasi" }));
    await waitFor(() => expect(countCalls("/api/simulate/compare")).toBe(2));
    await waitFor(() => expect(screen.queryByText(STALE)).not.toBeInTheDocument());
    expect(calls.filter((c) => c.url === "/api/simulate/compare")[1].body).toMatchObject({
      snapshot: { materials: expect.arrayContaining([expect.objectContaining({ id: "flour", stock_on_hand: 9000 })]) },
    });
  });

  it("resets to the original Dapur Sari fixture after confirmation", async () => {
    await renderDemo();
    await openTab("Data Usaha");
    const stock = screen.getByLabelText("Stok Tepung terigu (g)");
    await userEvent.clear(stock);
    await userEvent.type(stock, "1");
    expect(await screen.findByText(STALE)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reset ke Data Awal" }));
    expect(countCalls("/api/demo")).toBe(1); // belum reset sebelum konfirmasi
    await userEvent.click(screen.getByRole("button", { name: "Ya, Reset" }));

    await waitFor(() => expect(countCalls("/api/demo")).toBe(2));
    await waitFor(() => expect(screen.queryByText(STALE)).not.toBeInTheDocument());
    expect(screen.getByLabelText("Stok Tepung terigu (g)")).toHaveValue("8000");
    await openTab("Perbandingan");
    expect(await screen.findByText("+Rp 132.000")).toBeInTheDocument();
  });

  it("can cancel the reset confirmation", async () => {
    await renderDemo();
    await userEvent.click(screen.getByRole("button", { name: "Reset ke Data Awal" }));
    await userEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(screen.queryByRole("button", { name: "Ya, Reset" })).not.toBeInTheDocument();
    expect(countCalls("/api/demo")).toBe(1);
  });

  it("keeps guest edits in sessionStorage and restores them without refetching the template", async () => {
    await renderDemo();
    await openTab("Data Usaha");
    const stock = screen.getByLabelText("Stok Tepung terigu (g)");
    await userEvent.clear(stock);
    await userEvent.type(stock, "7777");
    cleanup();

    calls = [];
    render(<MicroChainWorkspace mode="demo" />);
    await screen.findByRole("tab", { name: "Data Usaha" });
    await openTab("Data Usaha");
    expect(screen.getByLabelText("Stok Tepung terigu (g)")).toHaveValue("7777");
    expect(countCalls("/api/demo")).toBe(0);
  });

  it("does not offer saving to a workspace in guest mode", async () => {
    await renderDemo();
    expect(screen.queryByRole("button", { name: "Simpan ke Workspace" })).not.toBeInTheDocument();
    expect(screen.getByText(/Mode tamu: perubahan hanya tersimpan di browser/)).toBeInTheDocument();
  });

  it("shows a friendly error when the simulation request fails", async () => {
    await renderDemo();
    const original = handler;
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url === "/api/simulate/compare" ? json({ error: "Data tidak valid. Periksa kembali isian Anda." }, 400) : original(url),
    ));
    await openTab("Data Usaha");
    const stock = screen.getByLabelText("Stok Tepung terigu (g)");
    await userEvent.clear(stock);
    await userEvent.type(stock, "5");
    await userEvent.click(await screen.findByRole("button", { name: "Jalankan Ulang Simulasi" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/tidak valid/i);
    expect(screen.getByText(STALE)).toBeInTheDocument();
  });
});

describe("MicroChainWorkspace (workspace)", () => {
  it("redirects to /login when the session is missing", async () => {
    workspaceStatus = 401;
    render(<MicroChainWorkspace mode="workspace" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("enables 'Simpan ke Workspace' only after changes and saves with the business id", async () => {
    render(<MicroChainWorkspace mode="workspace" />);
    await screen.findByRole("tab", { name: "Data Usaha" });
    const save = screen.getByRole("button", { name: "Simpan ke Workspace" });
    expect(save).toBeDisabled();

    await openTab("Data Usaha");
    const stock = screen.getByLabelText("Stok Tepung terigu (g)");
    await userEvent.clear(stock);
    await userEvent.type(stock, "8500");
    expect(screen.getByText(/Belum disimpan/)).toBeInTheDocument();
    expect(save).toBeEnabled();

    await userEvent.click(save);
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.method === "PUT")!;
    expect(put.body).toMatchObject({ businessId: BUSINESS_ID });
    await waitFor(() => expect(screen.getByRole("button", { name: "Simpan ke Workspace" })).toBeDisabled());
    expect(sessionStorage.length).toBe(0); // workspace tidak memakai penyimpanan sesi tamu
  });

  it("resets the persisted workspace through the API after confirmation", async () => {
    render(<MicroChainWorkspace mode="workspace" />);
    await screen.findByRole("tab", { name: "Data Usaha" });
    await userEvent.click(screen.getByRole("button", { name: "Reset ke Data Awal" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, Reset" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/workspace/reset" && c.method === "POST")).toBe(true));
  });
});

describe("Business data editing", () => {
  it("adds and removes entities, and keeps BOM edits safe against empty input", async () => {
    await renderDemo();
    await openTab("Data Usaha");

    await userEvent.type(screen.getByLabelText("Nama pemasok baru"), "Pemasok C");
    await userEvent.click(screen.getByRole("button", { name: "Tambah Pemasok" }));
    expect(screen.getByLabelText("Nama Pemasok C")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Hapus Pemasok C" }));
    expect(screen.queryByLabelText("Nama Pemasok C")).not.toBeInTheDocument();

    const bom = screen.getByLabelText("Resep Roti – Tepung terigu (g)");
    await userEvent.clear(bom); // kosong tidak boleh menyebabkan crash atau NaN
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.type(bom, "300");
    expect(await screen.findByText(STALE)).toBeInTheDocument();
  });
});
