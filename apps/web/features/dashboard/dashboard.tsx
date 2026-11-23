"use client";

import { useCallback } from "react";
import { Boxes, Building2, ChevronRight, CircleAlert, FlaskConical, Network } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/workspace";
import { Busy, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { analyzeNetwork } from "@/lib/api";
import { useDemo } from "@/lib/demo-context";
import { formatDate, formatNumber, formatQuantity } from "@/lib/format";
import { useRemote } from "@/lib/use-remote";

export function Dashboard() {
  const { demo, snapshot } = useDemo();
  const baseline = demo.scenarios.find((item) => item.id === "baseline") ?? demo.scenarios[0];
  const loadNetwork = useCallback((signal: AbortSignal) => analyzeNetwork(snapshot, baseline, signal), [snapshot, baseline]);
  const network = useRemote(loadNetwork);
  const critical = new Set(network.data?.single_source_risks.map(({ material_id }) => material_id));

  return (
    <>
      <PageHeader title="Ringkasan Usaha" action={<Button asChild><Link href="/simulator"><FlaskConical size={18} aria-hidden="true" /> Buka Simulator</Link></Button>}>
        Pantau bahan baku dan ketergantungan pemasok Dapur Sari.
      </PageHeader>
      <section className="overview-band" aria-label="Ringkasan Dapur Sari">
        <div className="overview-business"><span className="overview-icon"><Building2 size={24} aria-hidden="true" /></span><div><h2>{snapshot.business.name.replace(/\s*\(DATA SIMULASI\)\s*$/i, "")}</h2><p>{snapshot.business.sector}</p></div></div>
        <div className="overview-stat"><span>Pemasok</span><strong>{formatNumber(snapshot.suppliers.length)}</strong></div>
        <div className="overview-stat"><span>Bahan baku</span><strong>{formatNumber(snapshot.materials.length)}</strong></div>
        <div className="overview-stat"><span>Produk</span><strong>{formatNumber(snapshot.products.length)}</strong></div>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <header className="panel-heading"><div><h2>Stok bahan awal</h2><p>Posisi stok sebelum pengiriman terjadwal.</p></div><Boxes size={21} aria-hidden="true" /></header>
          <div className="stock-list">
            {snapshot.materials.map((material) => (
              <div key={material.id} className="stock-row"><div><strong>{material.name}</strong>{critical.has(material.id) && <span className="tag tag-warning">Satu pemasok</span>}</div><span>{formatQuantity(material.stock_on_hand, material.base_unit)}</span></div>
            ))}
          </div>
          <div className="panel-footer"><Link href="/data" className="text-link">Ubah data usaha <ChevronRight size={17} aria-hidden="true" /></Link></div>
        </section>
        <section className="panel">
          <header className="panel-heading"><div><h2>Risiko pemasok</h2><p>Berdasarkan kondisi normal pada {formatDate(baseline.cutoff_date)}.</p></div><Network size={21} aria-hidden="true" /></header>
          <div className="panel-body">
            {network.pending && <Busy label="Menganalisis jaringan pasok…" />}
            {network.error && <ErrorState message={network.error} retry={network.retry} />}
            {network.data && (network.data.single_source_risks.length ? (
              <ul className="risk-list">
                {network.data.single_source_risks.map((risk) => {
                  const material = snapshot.materials.find(({ id }) => id === risk.material_id);
                  const supplier = snapshot.suppliers.find(({ id }) => id === risk.supplier_id);
                  const products = snapshot.products.filter(({ id }) => risk.product_ids.includes(id)).map(({ name }) => name);
                  return <li key={risk.material_id}><CircleAlert size={19} aria-hidden="true" /><div><strong>{material?.name ?? risk.material_id}</strong><p>Pasokan terjadwal bergantung pada {supplier?.name ?? risk.supplier_id}. Produk bergantung pada bahan ini: {products.join(", ")}.</p></div></li>;
                })}
              </ul>
            ) : <p className="muted">Tidak ada bahan dengan satu pemasok pada kondisi normal.</p>)}
          </div>
          <div className="panel-footer"><Link href="/network" className="text-link">Lihat Jaringan Pasok <ChevronRight size={17} aria-hidden="true" /></Link></div>
        </section>
      </div>
      <section className="guide-panel">
        <div className="guide-icon"><FlaskConical size={23} aria-hidden="true" /></div>
        <div><h2>Uji jika pemasok utama gagal</h2><p>Bandingkan jumlah produksi yang dapat dipenuhi dan kontribusi setelah menambahkan pasokan alternatif.</p></div>
        <Button asChild variant="outline"><Link href="/comparison">Bandingkan Skenario</Link></Button>
      </section>
    </>
  );
}
