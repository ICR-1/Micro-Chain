"use client";

import { useState, type ReactNode } from "react";
import DateField from "@/components/ui/DateField";
import NumberField from "@/components/ui/NumberField";
import TextField from "@/components/ui/TextField";
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

interface Props {
  data: WorkspaceData;
  onChange: (next: WorkspaceData) => void;
}

const UNIT_KIND_LABEL: Record<UnitKind, string> = { mass: "Berat (g)", volume: "Volume (ml)", count: "Jumlah (pcs)" };

export default function BusinessDataView({ data, onChange }: Props) {
  const s = data.snapshot;
  /** Terapkan perubahan pada salinan dalam agar state asal tidak termutasi. */
  const patch = (fn: (draft: WorkspaceData) => void) => {
    const draft = structuredClone(data);
    fn(draft);
    onChange(draft);
  };
  const unitOf = (id: string) => s.materials.find((m) => m.id === id)?.base_unit ?? "";

  return (
    <div className="space-y-6">
      <Section title="Usaha">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nama usaha" value={s.business.name} onCommit={(v) => patch((d) => void (d.snapshot.business.name = v))} />
          <TextField label="Sektor" value={s.business.sector} onCommit={(v) => patch((d) => void (d.snapshot.business.sector = v))} />
          <DateField
            label="Tanggal perencanaan (batas)"
            value={s.business.planning_cutoff_date}
            onCommit={(v) => patch((d) => void (d.snapshot.business.planning_cutoff_date = v))}
          />
          <DateField
            label="Tanggal simulasi"
            value={s.scenario_date}
            onCommit={(v) =>
              patch((d) => {
                d.snapshot.scenario_date = v;
                d.snapshot.business.scenario_date = v;
              })
            }
          />
        </div>
      </Section>

      <Section title="Pemasok">
        <ul className="space-y-3">
          {s.suppliers.map((sup, i) => (
            <li key={sup.id} className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]">
              <TextField
                label={`Nama ${sup.name}`}
                value={sup.name}
                onCommit={(v) => patch((d) => void (d.snapshot.suppliers[i].name = v))}
              />
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--brand)]"
                  checked={sup.active}
                  onChange={(e) => patch((d) => void (d.snapshot.suppliers[i].active = e.target.checked))}
                />
                {sup.name} aktif
              </label>
              <RemoveButton label={`Hapus ${sup.name}`} onClick={() => onChange(removeSupplier(data, sup.id))} />
            </li>
          ))}
        </ul>
        <AddRow label="Nama pemasok baru" button="Tambah Pemasok" onAdd={(name) => onChange(addSupplier(data, name))} />
      </Section>

      <Section title="Bahan baku">
        <ul className="space-y-3">
          {s.materials.map((m, i) => (
            <li key={m.id} className="grid items-end gap-3 sm:grid-cols-[1fr_9rem_10rem_auto]">
              <TextField
                label={`Nama ${m.name}`}
                value={m.name}
                onCommit={(v) => patch((d) => void (d.snapshot.materials[i].name = v))}
              />
              <div>
                <label htmlFor={`kind-${m.id}`} className="block text-sm font-semibold">
                  Jenis {m.name}
                </label>
                <select
                  id={`kind-${m.id}`}
                  value={m.unit_kind}
                  onChange={(e) => onChange(setMaterialUnitKind(data, m.id, e.target.value as UnitKind))}
                  className="mt-1 min-h-10 w-full rounded-md border border-line bg-paper px-2 text-sm"
                >
                  {Object.entries(UNIT_KIND_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
              <NumberField
                label={`Stok ${m.name} (${m.base_unit})`}
                value={m.stock_on_hand}
                suffix={m.base_unit}
                onCommit={(n) => patch((d) => void (d.snapshot.materials[i].stock_on_hand = n))}
              />
              <RemoveButton label={`Hapus ${m.name}`} onClick={() => onChange(removeMaterial(data, m.id))} />
            </li>
          ))}
        </ul>
        <AddRow label="Nama bahan baru" button="Tambah Bahan" onAdd={(name) => onChange(addMaterial(data, name))} />
      </Section>

      <Section title="Produk">
        <ul className="space-y-3">
          {s.products.map((p, i) => (
            <li key={p.id} className="grid items-end gap-3 sm:grid-cols-[1fr_9rem_11rem_auto]">
              <TextField
                label={`Nama ${p.name}`}
                value={p.name}
                onCommit={(v) => patch((d) => void (d.snapshot.products[i].name = v))}
              />
              <NumberField
                label={`Permintaan ${p.name}`}
                value={p.demand_units}
                suffix="unit"
                onCommit={(n) => patch((d) => void (d.snapshot.products[i].demand_units = n))}
              />
              <NumberField
                label={`Kontribusi ${p.name} (Rp/unit)`}
                value={p.unit_contribution_idr}
                max={10_000_000}
                suffix="Rp"
                onCommit={(n) => patch((d) => void (d.snapshot.products[i].unit_contribution_idr = n))}
              />
              <RemoveButton label={`Hapus ${p.name}`} onClick={() => onChange(removeProduct(data, p.id))} />
            </li>
          ))}
        </ul>
        <AddRow label="Nama produk baru" button="Tambah Produk" onAdd={(name) => onChange(addProduct(data, name))} />
      </Section>

      <Section title="Resep (kebutuhan bahan per unit produk)">
        {s.products.length === 0 || s.materials.length === 0 ? (
          <p className="text-sm text-ink-muted">Tambahkan produk dan bahan terlebih dahulu. Isi 0 untuk bahan yang tidak dipakai.</p>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="Resep produk" className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="text-xs text-ink-muted">
                  <th scope="col" className="py-2 pr-3 text-left font-semibold">Produk</th>
                  {s.materials.map((m) => (
                    <th key={m.id} scope="col" className="py-2 pr-3 text-left font-semibold">{m.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {s.products.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="py-2 pr-3 text-left font-medium">{p.name}</th>
                    {s.materials.map((m) => (
                      <td key={m.id} className="py-2 pr-3">
                        <NumberField
                          hideLabel
                          label={`Resep ${p.name} – ${m.name} (${m.base_unit})`}
                          value={s.bom.find((b) => b.product_id === p.id && b.material_id === m.id)?.quantity_per_product ?? 0}
                          suffix={m.base_unit}
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
      </Section>

      <Section title="Pengiriman terjadwal">
        <ul className="space-y-4">
          {s.committed_deliveries.map((dl, i) => (
            <li key={dl.id} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_8rem_10rem_auto_auto]">
              <RefSelect
                label={`Pemasok pengiriman ${i + 1}`}
                value={dl.supplier_id}
                options={s.suppliers}
                onChange={(v) => patch((d) => void (d.snapshot.committed_deliveries[i].supplier_id = v))}
              />
              <RefSelect
                label={`Bahan pengiriman ${i + 1}`}
                value={dl.material_id}
                options={s.materials}
                onChange={(v) => patch((d) => void (d.snapshot.committed_deliveries[i].material_id = v))}
              />
              <NumberField
                label={`Jumlah pengiriman ${i + 1}`}
                value={dl.quantity_base_units}
                min={1}
                suffix={unitOf(dl.material_id)}
                onCommit={(n) => patch((d) => void (d.snapshot.committed_deliveries[i].quantity_base_units = n))}
              />
              <DateField
                label={`Tanggal tiba pengiriman ${i + 1}`}
                value={dl.arrival_date}
                onCommit={(v) => patch((d) => void (d.snapshot.committed_deliveries[i].arrival_date = v))}
              />
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--brand)]"
                  checked={dl.enabled_in_baseline}
                  onChange={(e) => patch((d) => void (d.snapshot.committed_deliveries[i].enabled_in_baseline = e.target.checked))}
                />
                Aktif di baseline {i + 1}
              </label>
              <RemoveButton label={`Hapus pengiriman ${i + 1}`} onClick={() => onChange(removeCommittedDelivery(data, dl.id))} />
            </li>
          ))}
        </ul>
        <AddButton
          label="Tambah Pengiriman"
          disabled={s.suppliers.length === 0 || s.materials.length === 0}
          onClick={() => onChange(addCommittedDelivery(data, s.suppliers[0].id, s.materials[0].id))}
        />
      </Section>

      <Section title="Penawaran cadangan">
        <ul className="space-y-4">
          {s.alternative_offers.map((o, i) => (
            <li key={o.id} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <RefSelect
                label={`Pemasok penawaran ${i + 1}`}
                value={o.supplier_id}
                options={s.suppliers}
                onChange={(v) => patch((d) => void (d.snapshot.alternative_offers[i].supplier_id = v))}
              />
              <RefSelect
                label={`Bahan penawaran ${i + 1}`}
                value={o.material_id}
                options={s.materials}
                onChange={(v) => patch((d) => void (d.snapshot.alternative_offers[i].material_id = v))}
              />
              <NumberField
                label={`Isi per pak penawaran ${i + 1}`}
                value={o.pack_size_base_units}
                min={1}
                suffix={unitOf(o.material_id)}
                onCommit={(n) => patch((d) => void (d.snapshot.alternative_offers[i].pack_size_base_units = n))}
              />
              <NumberField
                label={`Maksimal pak penawaran ${i + 1}`}
                value={o.max_packs}
                suffix="pak"
                onCommit={(n) => patch((d) => void (d.snapshot.alternative_offers[i].max_packs = n))}
              />
              <NumberField
                label={`Lead time penawaran ${i + 1} (hari)`}
                value={o.lead_days}
                max={365}
                suffix="hari"
                onCommit={(n) => patch((d) => void (d.snapshot.alternative_offers[i].lead_days = n))}
              />
              <NumberField
                label={`Premi per pak penawaran ${i + 1} (Rp)`}
                value={o.incremental_premium_idr_per_pack}
                max={10_000_000}
                suffix="Rp"
                onCommit={(n) => patch((d) => void (d.snapshot.alternative_offers[i].incremental_premium_idr_per_pack = n))}
              />
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--brand)]"
                  checked={o.enabled_in_scenario}
                  onChange={(e) => patch((d) => void (d.snapshot.alternative_offers[i].enabled_in_scenario = e.target.checked))}
                />
                Tersedia untuk skenario {i + 1}
              </label>
              <RemoveButton label={`Hapus penawaran ${i + 1}`} onClick={() => onChange(removeAlternativeOffer(data, o.id))} />
            </li>
          ))}
        </ul>
        <AddButton
          label="Tambah Penawaran"
          disabled={s.suppliers.length === 0 || s.materials.length === 0}
          onClick={() => onChange(addAlternativeOffer(data, s.suppliers[0].id, s.materials[0].id))}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-line bg-paper p-4 sm:p-5">
      <h3 className="mb-4 text-lg font-bold">{title}</h3>
      {children}
    </section>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 rounded-md px-3 text-sm font-semibold text-danger hover:bg-danger-tint"
    >
      {label}
    </button>
  );
}

function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 min-h-10 rounded-md border border-dashed border-line px-3 text-sm font-semibold text-ink-muted hover:border-ink hover:text-ink disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function AddRow({ label, button, onAdd }: { label: string; button: string; onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim());
        setName("");
      }}
    >
      <div className="min-w-0 flex-1 sm:max-w-xs">
        <label htmlFor={`add-${button}`} className="block text-sm font-semibold">
          {label}
        </label>
        <input
          id={`add-${button}`}
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 min-h-10 w-full rounded-md border border-line bg-paper px-2.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={!name.trim()}
        className="min-h-10 rounded-md border border-line bg-paper px-3 text-sm font-semibold hover:border-ink disabled:opacity-50"
      >
        {button}
      </button>
    </form>
  );
}

function RefSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (id: string) => void;
}) {
  const id = `sel-${label.replace(/\s+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-10 w-full rounded-md border border-line bg-paper px-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </div>
  );
}
