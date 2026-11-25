"use client";

import { useMemo } from "react";
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { SupplyNetworkModel, SupplyNode } from "@/lib/domain/graph";
import { BADGE_CLASS, KIND_LABEL, nodeBadges } from "./graph-shared";

interface CardData extends Record<string, unknown> {
  node: SupplyNode;
  selected: boolean;
  onSelect: (id: string) => void;
}
type CardNode = Node<CardData, "supply">;

function SupplyCard({ data }: NodeProps<CardNode>) {
  const { node, selected, onSelect } = data;
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        aria-pressed={selected}
        className={`pointer-events-auto w-[200px] rounded-md border bg-paper px-3 py-2 text-left shadow-sm ${
          selected ? "border-brand ring-2 ring-brand" : "border-line hover:border-ink"
        }`}
      >
        <span className="block text-xs text-ink-muted">{KIND_LABEL[node.kind]}</span>
        <span className="block text-sm font-semibold">{node.label}</span>
        {nodeBadges(node).length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {nodeBadges(node).map((b) => (
              <span key={b.text} className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${BADGE_CLASS[b.tone]}`}>
                {b.text}
              </span>
            ))}
          </span>
        )}
      </button>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </>
  );
}

const nodeTypes = { supply: SupplyCard };

interface Props {
  network: SupplyNetworkModel;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Kanvas React Flow 3 kolom (`Pemasok -> Bahan -> Produk`); hanya dimuat di layar >= 640px. */
export default function SupplyGraphCanvas({ network, selectedId, onSelect }: Props) {
  const nodes = useMemo<CardNode[]>(
    () =>
      network.nodes.map((n) => ({
        id: n.id,
        type: "supply",
        position: n.position,
        draggable: false,
        selectable: false,
        data: { node: n, selected: n.id === selectedId, onSelect },
      })),
    [network.nodes, selectedId, onSelect],
  );

  const edges = useMemo<Edge[]>(
    () =>
      network.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        // Label resep hanya muncul untuk node terpilih agar tidak bertumpuk.
        label: e.kind === "bom" && e.source !== selectedId && e.target !== selectedId ? undefined : e.label,
        type: "smoothstep",
        selectable: false,
        animated: false,
        style: {
          stroke: e.disrupted ? "#be123c" : e.kind === "alternative" ? "#0f766e" : "#46594f",
          strokeWidth: e.kind === "bom" ? 1.25 : 2,
          strokeDasharray: e.kind === "alternative" ? "6 4" : undefined,
        },
        labelStyle: { fontSize: 11, fill: "#132a23" },
        labelBgStyle: { fill: "#f7f8f5" },
      })),
    [network.edges, selectedId],
  );

  return (
    <div className="h-[30rem] rounded-lg border border-line bg-paper" role="group" aria-label="Graf jaringan pasok">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: false }}
      >
        <Background gap={24} color="#d6dcd3" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
