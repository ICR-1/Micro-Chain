"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, FlaskConical, Play } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/workspace";
import { Busy, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ParameterForm } from "@/features/data-editor/parameter-form";
import { preview } from "@/lib/api";
import { useDemo } from "@/lib/demo-context";
import { formatDate } from "@/lib/format";
import type { SimulationResult, Snapshot } from "@/lib/types";
import { SimulationResults } from "./results";
import { ScenarioPicker } from "./scenario-picker";

interface Completed {
  snapshot: Snapshot;
  scenarioId: string;
  result?: SimulationResult;
  error?: string;
}

export function Simulator() {
  const { demo, snapshot, scenario, selectScenario, saveSnapshot, markSimulated, unsimulatedChanges } = useDemo();
  const controller = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState<Completed>();
  const current = completed?.snapshot === snapshot && completed.scenarioId === scenario.id ? completed : undefined;

  useEffect(() => () => controller.current?.abort(), []);

  async function run(next: Snapshot) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    saveSnapshot(next);
    setPending(true);
    setCompleted(undefined);
    try {
      const result = await preview(next, scenario, request.signal);
      if (!request.signal.aborted) {
        setCompleted({ snapshot: next, scenarioId: scenario.id, result });
        if (result.kpis) markSimulated(next);
      }
    } catch (error) {
      if (!request.signal.aborted) setCompleted({ snapshot: next, scenarioId: scenario.id, error: error instanceof Error ? error.message : "Simulasi gagal." });
    } finally {
      if (!request.signal.aborted) setPending(false);
    }
  }

  return (
    <>
      <PageHeader title="Simulator Pasokan" action={<Button asChild variant="outline"><Link href="/comparison">Lihat Perbandingan</Link></Button>}>
        Uji dampak gangguan terhadap produksi Dapur Sari.
      </PageHeader>
      <section className="panel simulator-controls" aria-label="Pengaturan simulasi">
        <header className="panel-heading"><div><h2>Pilih Skenario</h2><p>Atur kondisi pasokan untuk satu periode produksi.</p></div><span className="date-stamp"><CalendarDays size={16} aria-hidden="true" /> {formatDate(scenario.cutoff_date)}</span></header>
        <div className="panel-body">
          <ScenarioPicker scenarios={demo.scenarios} selected={scenario} onChange={(id) => { setCompleted(undefined); selectScenario(id); }} pending={pending} />
          <ParameterForm snapshot={snapshot} onApply={run} pending={pending} compact>
            {({ dirty }) => <>
              <div className="simulator-actions">
                <div className="form-notice" aria-live="polite">{(dirty || unsimulatedChanges) && "Perubahan belum disimulasikan"}</div>
                <Button type="submit" disabled={pending}><Play size={17} aria-hidden="true" /> {pending ? "Menjalankan Simulasi…" : "Jalankan Simulasi"}</Button>
              </div>
              <div className="simulator-output" aria-live="polite">
                {pending && <Busy label="Menghitung rencana produksi…" />}
                {!dirty && current?.error && <ErrorState message={current.error} retry={() => run(snapshot)} />}
                {!dirty && current?.result && <SimulationResults result={current.result} snapshot={snapshot} />}
                {!pending && !current && <div className="simulation-empty"><FlaskConical size={20} aria-hidden="true" /><p>Jalankan simulasi untuk melihat rencana produksi dan penggunaan bahan.</p></div>}
              </div>
            </>}
          </ParameterForm>
        </div>
      </section>
    </>
  );
}
