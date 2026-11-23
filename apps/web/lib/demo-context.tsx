"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Busy, ErrorState } from "@/components/states";
import { getDemo } from "./api";
import type { DemoData, Scenario, Snapshot } from "./types";
import { useRemote } from "./use-remote";

interface DemoContextValue {
  demo: DemoData;
  snapshot: Snapshot;
  selectScenario: (id: string) => void;
  scenario: Scenario;
  saveSnapshot: (snapshot: Snapshot) => void;
  resetDemo: () => void;
  markSimulated: (snapshot: Snapshot) => void;
  unsimulatedChanges: boolean;
}

const DemoContext = createContext<DemoContextValue | null>(null);

function DemoSession({ demo, children }: { demo: DemoData; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(demo.snapshot);
  const [simulated, setSimulated] = useState(demo.snapshot);
  const [scenarioId, setScenarioId] = useState(demo.scenarios[0].id);
  const scenario = demo.scenarios.find((entry) => entry.id === scenarioId) ?? demo.scenarios[0];

  function resetDemo() {
    setSnapshot(demo.snapshot);
    setScenarioId(demo.scenarios[0].id);
  }

  return (
    <DemoContext.Provider value={{
      demo, snapshot, scenario, selectScenario: setScenarioId, saveSnapshot: setSnapshot, resetDemo,
      markSimulated: setSimulated, unsimulatedChanges: snapshot !== simulated,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const demo = useRemote(getDemo);
  if (demo.error) return <ErrorState message={demo.error} retry={demo.retry} />;
  if (!demo.data) return <Busy label="Memuat data Dapur Sari…" />;
  if (!demo.data.scenarios.length) return <ErrorState message="Skenario demo belum tersedia." retry={demo.retry} />;
  return <DemoSession demo={demo.data}>{children}</DemoSession>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("Tampilan ini memerlukan data demo.");
  return context;
}
