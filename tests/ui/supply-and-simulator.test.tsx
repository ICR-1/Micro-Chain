// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DAPUR_SARI_FALLBACK_FIXTURE } from "@/lib/domain/fixture";
import type { ScenarioResult, WorkspaceData } from "@/lib/domain/types";
import { solveScenario } from "@/lib/solver/milp-solver";

vi.mock("@/components/workspace/SupplyGraphCanvas", () => ({
  default: () => <div data-testid="graph-canvas" />,
}));

import SupplyGraphView from "@/components/workspace/SupplyGraphView";
import SimulatorView from "@/components/workspace/SimulatorView";

const fresh = (): WorkspaceData => structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
let results: ScenarioResult[];

beforeAll(async () => {
  const { snapshot, scenarios } = fresh();
  results = await Promise.all(scenarios.map((s) => solveScenario(snapshot, s)));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SupplyGraphView", () => {
  it("shows a structured list below 640px with a Sumber Tunggal badge on Tepung terigu only", () => {
    const { snapshot, scenarios } = fresh();
    render(<SupplyGraphView snapshot={snapshot} scenario={scenarios[0]} result={results[0]} />);

    expect(screen.queryByTestId("graph-canvas")).not.toBeInTheDocument();
    const materials = screen.getByRole("list", { name: "Bahan" });
    const flour = within(materials).getByRole("button", { name: /Tepung terigu/ });
    expect(within(flour).getByText("Sumber Tunggal")).toBeInTheDocument();
    const sugar = within(materials).getByRole("button", { name: /Gula pasir/ });
    expect(within(sugar).queryByText("Sumber Tunggal")).not.toBeInTheDocument();
  });

  it("opens the detail panel when an item is clicked", async () => {
    const { snapshot, scenarios } = fresh();
    render(<SupplyGraphView snapshot={snapshot} scenario={scenarios[0]} result={results[0]} />);
    expect(screen.getByText(/Pilih pemasok, bahan, atau produk/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Tepung terigu/ }));
    const panel = screen.getByRole("region", { name: "Detail Tepung terigu" });
    expect(within(panel).getByText("8.000 g")).toBeInTheDocument();
    expect(within(panel).getByText(/Pemasok A/)).toBeInTheDocument();
    expect(within(panel).getByText(/Cadangan: Pemasok B/)).toBeInTheDocument();
  });

  it("marks the disrupted supplier and bottleneck material in the outage scenario", () => {
    const { snapshot, scenarios } = fresh();
    render(<SupplyGraphView snapshot={snapshot} scenario={scenarios[1]} result={results[1]} />);
    const supplierA = screen.getByRole("button", { name: /Pemasok A/ });
    expect(within(supplierA).getByText("Terganggu")).toBeInTheDocument();
    const flour = screen.getByRole("button", { name: /Tepung terigu/ });
    expect(within(flour).getByText("Penghambat")).toBeInTheDocument();
  });

  it("renders the React Flow canvas instead of the list at >= 640px", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {},
    }));
    const { snapshot, scenarios } = fresh();
    render(<SupplyGraphView snapshot={snapshot} scenario={scenarios[0]} result={results[0]} />);
    expect(await screen.findByTestId("graph-canvas")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Bahan" })).not.toBeInTheDocument();
  });
});

function renderSimulator(overrides: Partial<React.ComponentProps<typeof SimulatorView>> = {}) {
  const { snapshot, scenarios } = fresh();
  const mocks = { onSelect: vi.fn(), onChange: vi.fn(), onAdd: vi.fn(), onRemove: vi.fn(), onRun: vi.fn() };
  render(
    <SimulatorView
      snapshot={snapshot} scenarios={scenarios} selectedId="mitigation" results={results}
      isStale={false} running={false} {...mocks} {...overrides}
    />,
  );
  return mocks;
}

describe("SimulatorView", () => {
  it("shows production plan, premium cost, net contribution and solver status", () => {
    renderSimulator();
    const plan = screen.getByRole("table", { name: "Rencana produksi" });
    const bread = within(plan).getByRole("row", { name: /Roti/ });
    expect(within(bread).getByText("68")).toBeInTheDocument();
    const summary = within(screen.getByRole("region", { name: "Ringkasan hasil" }));
    expect(summary.getByText("Rp 12.000")).toBeInTheDocument(); // biaya premi
    expect(summary.getByText("Rp 342.000")).toBeInTheDocument(); // kontribusi bersih
    expect(summary.getByText("Optimal")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Pemakaian bahan" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Paket alternatif" })).toBeInTheDocument();
  });

  it("flags stale results and offers a recalculate action", async () => {
    const props = renderSimulator({ isStale: true });
    expect(screen.getByText(/hasil simulasi sebelumnya sudah basi/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Jalankan Ulang Simulasi" }));
    expect(props.onRun).toHaveBeenCalledTimes(1);
  });

  it("toggling a supplier updates disabled_supplier_ids of the selected scenario", async () => {
    const props = renderSimulator({ selectedId: "baseline" });
    await userEvent.click(screen.getByRole("checkbox", { name: /Pemasok A gagal kirim/ }));
    const next = props.onChange.mock.calls[0][0];
    expect(next.id).toBe("baseline");
    expect(next.disabled_supplier_ids).toEqual(["supplier_a"]);
  });

  it("toggling an offer and editing delay_days / cutoff_date update the scenario", async () => {
    const props = renderSimulator({ selectedId: "baseline" });
    await userEvent.click(screen.getByRole("checkbox", { name: /Aktifkan penawaran Pemasok B/ }));
    expect(props.onChange.mock.calls[0][0].enabled_offer_ids).toEqual(["supplier_b_flour_offer"]);

    const delay = screen.getByLabelText(/Keterlambatan Pemasok A/);
    await userEvent.clear(delay);
    await userEvent.type(delay, "3");
    const last = props.onChange.mock.calls.at(-1)![0];
    expect(last.disruptions).toEqual([{ type: "delay_delivery", delivery_id: "supplier_a_flour_delivery", delay_days: 3 }]);

    const cutoff = screen.getByLabelText("Tanggal batas");
    fireEvent.change(cutoff, { target: { value: "2026-11-30" } }); // input date mengirim satu event dengan tanggal lengkap
    expect(props.onChange.mock.calls.at(-1)![0].cutoff_date).toBe("2026-11-30");
  });

  it("does not crash or emit NaN when a number field is emptied or filled with junk", async () => {
    const props = renderSimulator({ selectedId: "baseline" });
    const delay = screen.getByLabelText(/Keterlambatan Pemasok A/);
    await userEvent.clear(delay);
    await userEvent.type(delay, "abc");
    await userEvent.type(delay, "-5");
    for (const [scenario] of props.onChange.mock.calls) {
      for (const d of scenario.disruptions) expect(Number.isInteger(d.delay_days) && d.delay_days >= 0).toBe(true);
    }
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows 'Dinonaktifkan di Data Usaha' for offers turned off globally", () => {
    const { snapshot, scenarios } = fresh();
    snapshot.alternative_offers[0].enabled_in_scenario = false;
    render(
      <SimulatorView
        snapshot={snapshot} scenarios={scenarios} selectedId="mitigation" results={results}
        isStale={false} running={false} onSelect={vi.fn()} onChange={vi.fn()} onAdd={vi.fn()}
        onRemove={vi.fn()} onRun={vi.fn()}
      />,
    );
    expect(screen.getByText("Dinonaktifkan di Data Usaha")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Aktifkan penawaran Pemasok B/ })).toBeDisabled();
  });

  it("selects scenarios and only allows removing custom ones", async () => {
    const { snapshot, scenarios } = fresh();
    scenarios.push({ ...structuredClone(scenarios[0]), id: "kustom", name: "Kustom", source: "user" });
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    render(
      <SimulatorView
        snapshot={snapshot} scenarios={scenarios} selectedId="kustom" results={results}
        isStale={false} running={false} onSelect={onSelect} onChange={vi.fn()} onAdd={vi.fn()}
        onRemove={onRemove} onRun={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Normal" }));
    expect(onSelect).toHaveBeenCalledWith("baseline");
    await userEvent.click(screen.getByRole("button", { name: "Hapus Skenario" }));
    expect(onRemove).toHaveBeenCalledWith("kustom");

    cleanup();
    renderSimulator({ selectedId: "baseline" });
    expect(screen.queryByRole("button", { name: "Hapus Skenario" })).not.toBeInTheDocument();
  });
});
