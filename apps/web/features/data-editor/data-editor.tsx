"use client";

import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo-context";
import { ParameterForm } from "./parameter-form";

export function DataEditor() {
  const { resetDemo, saveSnapshot, snapshot, unsimulatedChanges } = useDemo();
  const [resetVersion, setResetVersion] = useState(0);
  const [notice, setNotice] = useState("");
  return (
    <>
      <PageHeader title="Data Usaha">Sesuaikan stok, permintaan, dan kapasitas pemasok pada sesi demo ini.</PageHeader>
      <section className="panel">
        <header className="panel-heading"><div><h2>Parameter Dapur Sari</h2><p>Masukkan jumlah dalam satuan yang tercantum pada setiap kolom.</p></div></header>
        <div className="panel-body">
          <ParameterForm key={resetVersion} snapshot={snapshot} onApply={(next) => {
            saveSnapshot(next);
            setNotice("Parameter disimpan untuk sesi demo ini.");
          }}>
            {({ dirty }) => <div className="parameter-actions">
              <div className="form-notice" aria-live="polite">{dirty || unsimulatedChanges ? "Perubahan belum disimulasikan" : notice}</div>
              <div className="action-row">
                <Button type="button" variant="outline" onClick={() => { resetDemo(); setResetVersion((value) => value + 1); setNotice("Data demo dikembalikan ke awal."); }}><RotateCcw size={17} aria-hidden="true" /> Reset Demo</Button>
                <Button type="submit" disabled={!dirty}><Save size={17} aria-hidden="true" /> Simpan Perubahan</Button>
              </div>
            </div>}
          </ParameterForm>
        </div>
      </section>
    </>
  );
}
