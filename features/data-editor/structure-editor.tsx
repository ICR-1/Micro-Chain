"use client";

import { useId, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput, NumberInput, TextInput } from "@/components/ui/number-input";
import {
  addAlternativeOffer,
  addCommittedDelivery,
  addMaterial,
  addProduct,
  addSupplier,
  removeAlternativeOffer,
  removeCommittedDelivery,
  removeMaterial,
  removeProduct,
  removeSupplier,
  setBomQuantity,
  setMaterialUnitKind,
} from "@/lib/domain/mutations";
import type { UnitKind, WorkspaceData } from "@/lib/domain/types";
import { formatQuantity } from "@/lib/format";

interface Props {
  data: WorkspaceData;
  onChange: (next: WorkspaceData) => void;
}

const UNIT_KIND_LABEL: Record<UnitKind, string> = { mass: "Berat (g)", volume: "Volume (ml)", count: "Jumlah (pcs)" };

/**
 * Editor struktur usaha: pemasok, bahan, produk, resep, pengiriman, dan penawaran (tambah/ubah/hapus).
 * Stok, permintaan, dan batas pak ada di formulir parameter. Setiap perubahan langsung diterapkan.
 */
export function StructureEditor({ data, onChange }: Props) {
  const s = data.snapshot;
  const patch = (fn: (draft: WorkspaceData) => void) => {
    const draft = structuredClone(data);
    fn(draft);
    onChange(draft);
  };
  const unitOf = (id: string) => s.materials.find((m) => m.id === id)?.base_unit ?? "g";

  return (
    <>
      <Panel title="Profil usaha" description="Nama, sektor, dan tanggal acuan perencanaan.">
        <div className="parameter-fields entity-fields">
          <TextInput label="Nama usaha" value={s.business.name} onCommit={(v) => patch((d) => void (d.snapshot.business.name = v))} />
          <TextInput label="Sektor" value={s.business.sector} onCommit={(v) => patch((d) => void (d.snapshot.business.sector = v))} />
          <DateInput label="Tanggal perencanaan (batas)" value={s.business.planning_cutoff_date} onCommit={(v) => patch((d) => void (d.snapshot.business.planning_cutoff_date = v))} />
          <DateInput
            label="Tanggal simulasi"
            value={s.scenario_date}
            onCommit={(v) => patch((d) => { d.snapshot.scenario_date = v; d.snapshot.business.scenario_date = v; })}
          />
        </div>
      </Panel>

      <Panel title="Pemasok" description="Pemasok yang dinonaktifkan tidak dihitung di semua skenario.">
        <ul className="entity-list">
          {s.suppliers.map((sup, i) => (
            <li key={sup.id} className="entity-row">
              <TextInput label={`Nama ${sup.name}`} value={sup.name} onCommit={(v) => patch((d) => void (d.snapshot.suppliers[i].name = v))} />
              <label className="check-row entity-check">
                <input type="checkbox" checked={sup.active} onChange={(e) => patch((d) => void (d.snapshot.suppliers[i].active = e.target.checked))} />
                <span>{sup.name} aktif</span>
              </label>
              <RemoveButton label={`Hapus ${sup.name}`} onClick={() => onChange(removeSupplier(data, sup.id))} />
            </li>
          ))}
        </ul>
        <AddRow label="Nama pemasok baru" button="Tambah Pemasok" onAdd={(name) => onChange(addSupplier(data, name))} />
      </Panel>

      <Panel title="Bahan baku" description="Stok bahan diatur di formulir parameter di atas.">
        <ul className="entity-list">
          {s.materials.map((m, i) => (
            <li key={m.id} className="entity-row">
              <TextInput label={`Nama ${m.name}`} value={m.name} onCommit={(v) => patch((d) => void (d.snapshot.materials[i].name = v))} />
              <SelectField
                label={`Jenis ${m.name}`}
                value={m.unit_kind}
                options={Object.entries(UNIT_KIND_LABEL).map(([id, name]) => ({ id, name }))}
                onChange={(v) => onChange(setMaterialUnitKind(data, m.id, v as UnitKind))}
              />
              <RemoveButton label={`Hapus ${m.name}`} onClick={() => onChange(removeMaterial(data, m.id))} />
            </li>
          ))}
        </ul>
        <AddRow label="Nama bahan baru" button="Tambah Bahan" onAdd={(name) => onChange(addMaterial(data, name))} />
      </Panel>

      <Panel title="Produk" description="Permintaan produk diatur di formulir parameter di atas.">
        <ul className="entity-list">
          {s.products.map((p, i) => (
            <li key={p.id} className="entity-row">
              <TextInput label={`Nama ${p.name}`} value={p.name} onCommit={(v) => patch((d) => void (d.snapshot.products[i].name = v))} />
              <NumberInput
                label={`Kontribusi ${p.name} (Rp per unit)`}
                value={p.unit_contribution_idr}
                max={10_000_000}
                onCommit={(n) => patch((d) => void (d.snapshot.products[i].unit_contribution_idr = n))}
              />
              <RemoveButton label={`Hapus ${p.name}`} onClick={() => onChange(removeProduct(data, p.id))} />
            </li>
          ))}
        </ul>
        <AddRow label="Nama produk baru" button="Tambah Produk" onAdd={(name) => onChange(addProduct(data, name))} />
      </Panel>

      <Panel title="Resep" description="Kebutuhan bahan untuk satu unit produk. Isi 0 bila bahan tidak dipakai.">
        {s.products.length === 0 || s.materials.length === 0 ? (
          <p className="muted">Tambahkan produk dan bahan terlebih dahulu.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table recipe-table" aria-label="Resep produk">
              <thead>
                <tr>
                  <th scope="col">Produk</th>
                  {s.materials.map((m) => <th key={m.id} scope="col">{m.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {s.products.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">{p.name}</th>
                    {s.materials.map((m) => (
                      <td key={m.id}>
                        <NumberInput
                          hideLabel
                          label={`Resep ${p.name} – ${m.name} (${m.base_unit})`}
                          value={s.bom.find((b) => b.product_id === p.id && b.material_id === m.id)?.quantity_per_product ?? 0}
                          onCommit={(n) => onChange(setBomQuantity(data, p.id, m.id, n))}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Pengiriman terjadwal" description="Pasokan yang sudah dijanjikan pemasok sebelum batas waktu.">
        <ul className="entity-list">
          {s.committed_deliveries.map((dl, i) => (
            <li key={dl.id} className="entity-row entity-row-wide">
              <SelectField label={`Pemasok pengiriman ${i + 1}`} value={dl.supplier_id} options={s.suppliers} onChange={(v) => patch((d) => void (d.snapshot.committed_deliveries[i].supplier_id = v))} />
              <SelectField label={`Bahan pengiriman ${i + 1}`} value={dl.material_id} options={s.materials} onChange={(v) => patch((d) => void (d.snapshot.committed_deliveries[i].material_id = v))} />
              <NumberInput
                label={`Jumlah pengiriman ${i + 1} (${unitOf(dl.material_id)})`}
                value={dl.quantity_base_units}
                min={1}
                hint={formatQuantity(dl.quantity_base_units, unitOf(dl.material_id))}
                onCommit={(n) => patch((d) => void (d.snapshot.committed_deliveries[i].quantity_base_units = n))}
              />
              <DateInput label={`Tanggal tiba pengiriman ${i + 1}`} value={dl.arrival_date} onCommit={(v) => patch((d) => void (d.snapshot.committed_deliveries[i].arrival_date = v))} />
              <label className="check-row entity-check">
                <input type="checkbox" checked={dl.enabled_in_baseline} onChange={(e) => patch((d) => void (d.snapshot.committed_deliveries[i].enabled_in_baseline = e.target.checked))} />
                <span>Aktif di kondisi normal {i + 1}</span>
              </label>
              <RemoveButton label={`Hapus pengiriman ${i + 1}`} onClick={() => onChange(removeCommittedDelivery(data, dl.id))} />
            </li>
          ))}
        </ul>
        <AddButton label="Tambah Pengiriman" disabled={s.suppliers.length === 0 || s.materials.length === 0} onClick={() => onChange(addCommittedDelivery(data, s.suppliers[0].id, s.materials[0].id))} />
      </Panel>

      <Panel title="Penawaran alternatif" description="Pembelian cadangan: batas pak diatur di formulir parameter di atas.">
        <ul className="entity-list">
          {s.alternative_offers.map((o, i) => (
            <li key={o.id} className="entity-row entity-row-wide">
              <SelectField label={`Pemasok penawaran ${i + 1}`} value={o.supplier_id} options={s.suppliers} onChange={(v) => patch((d) => void (d.snapshot.alternative_offers[i].supplier_id = v))} />
              <SelectField label={`Bahan penawaran ${i + 1}`} value={o.material_id} options={s.materials} onChange={(v) => patch((d) => void (d.snapshot.alternative_offers[i].material_id = v))} />
              <NumberInput
                label={`Isi per pak penawaran ${i + 1} (${unitOf(o.material_id)})`}
                value={o.pack_size_base_units}
                min={1}
                onCommit={(n) => patch((d) => void (d.snapshot.alternative_offers[i].pack_size_base_units = n))}
              />
              <NumberInput label={`Lead time penawaran ${i + 1} (hari)`} value={o.lead_days} max={365} onCommit={(n) => patch((d) => void (d.snapshot.alternative_offers[i].lead_days = n))} />
              <NumberInput
                label={`Biaya tambahan per pak penawaran ${i + 1} (Rp)`}
                value={o.incremental_premium_idr_per_pack}
                max={10_000_000}
                onCommit={(n) => patch((d) => void (d.snapshot.alternative_offers[i].incremental_premium_idr_per_pack = n))}
              />
              <label className="check-row entity-check">
                <input type="checkbox" checked={o.enabled_in_scenario} onChange={(e) => patch((d) => void (d.snapshot.alternative_offers[i].enabled_in_scenario = e.target.checked))} />
                <span>Tersedia untuk skenario {i + 1}</span>
              </label>
              <RemoveButton label={`Hapus penawaran ${i + 1}`} onClick={() => onChange(removeAlternativeOffer(data, o.id))} />
            </li>
          ))}
        </ul>
        <AddButton label="Tambah Penawaran" disabled={s.suppliers.length === 0 || s.materials.length === 0} onClick={() => onChange(addAlternativeOffer(data, s.suppliers[0].id, s.materials[0].id))} />
      </Panel>
    </>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="panel structure-panel" aria-label={title}>
      <header className="panel-heading"><div><h2>{title}</h2><p>{description}</p></div></header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button type="button" variant="ghost" size="sm" className="entity-remove" onClick={onClick}><Trash2 size={16} aria-hidden="true" /> {label}</Button>;
}

function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return <Button type="button" variant="outline" size="sm" className="entity-add" onClick={onClick} disabled={disabled}><Plus size={16} aria-hidden="true" /> {label}</Button>;
}

function AddRow({ label, button, onAdd }: { label: string; button: string; onAdd: (name: string) => void }) {
  const id = useId();
  const [name, setName] = useState("");
  return (
    <form
      className="add-row"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim());
        setName("");
      }}
    >
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <Input id={id} value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={!name.trim()}><Plus size={16} aria-hidden="true" /> {button}</Button>
    </form>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { id: string; name: string }[]; onChange: (id: string) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
