import type { SupplyNode } from "@/lib/domain/graph";

export type BadgeTone = "danger" | "warn" | "neutral";

export interface NodeBadge {
  text: string;
  tone: BadgeTone;
}

export const BADGE_CLASS: Record<BadgeTone, string> = {
  danger: "bg-danger-tint text-danger",
  warn: "bg-warn-tint text-warn",
  neutral: "bg-brand-tint text-brand-strong",
};

/** Lencana status node; dipakai bersama oleh daftar mobile dan kanvas React Flow. */
export function nodeBadges(node: SupplyNode): NodeBadge[] {
  const badges: NodeBadge[] = [];
  if (node.kind === "supplier") {
    if (!node.meta.active) badges.push({ text: "Nonaktif", tone: "warn" });
    if (node.meta.disrupted) badges.push({ text: "Terganggu", tone: "danger" });
  } else if (node.kind === "material") {
    if (node.meta.isSingleSupplier) badges.push({ text: "Sumber Tunggal", tone: "warn" });
    if (node.meta.isBottleneck) badges.push({ text: "Penghambat", tone: "danger" });
  } else if (node.meta.dependsOnSingleSupplier) {
    badges.push({ text: "Bergantung Sumber Tunggal", tone: "warn" });
  }
  return badges;
}

export const KIND_LABEL = { supplier: "Pemasok", material: "Bahan", product: "Produk" } as const;
