export type BaseUnit = "g" | "ml" | "pcs";

export interface Business {
  id: string;
  name: string;
  sector: string;
  currency: "IDR";
  planning_cutoff_date: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  active: boolean;
  notes: string;
}

export interface Material {
  id: string;
  business_id: string;
  name: string;
  unit_kind: "mass" | "volume" | "count";
  base_unit: BaseUnit;
  stock_on_hand: number;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  demand_units: number;
  unit_contribution_idr: number;
}

export interface Snapshot {
  business: Business;
  suppliers: Supplier[];
  materials: Material[];
  products: Product[];
  bom: { product_id: string; material_id: string; quantity_per_product: number }[];
  committed_deliveries: {
    id: string;
    supplier_id: string;
    material_id: string;
    quantity_base_units: number;
    arrival_date: string;
    enabled_in_baseline: boolean;
  }[];
  alternative_offers: {
    id: string;
    supplier_id: string;
    material_id: string;
    pack_size_base_units: number;
    max_packs: number;
    lead_days: number;
    incremental_premium_idr_per_pack: number;
    enabled_in_scenario: boolean;
  }[];
  scenario_date: string;
  demo_data: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  cutoff_date: string;
  disabled_supplier_ids: string[];
  enabled_offer_ids: string[];
  disruptions: {
    type: "supplier_outage";
    affected_supplier_ids: string[];
    start_date: string;
    end_date: string;
    notes: string;
  }[];
  overrides: {
    stock_on_hand: Record<string, number>;
    demand_units: Record<string, number>;
    max_packs: Record<string, number>;
  };
  source: "demo" | "user";
}

export interface DemoData {
  snapshot: Snapshot;
  scenarios: Scenario[];
  demo_data: boolean;
}

export type SolverStatus = "OPTIMAL" | "FEASIBLE" | "INFEASIBLE" | "UNKNOWN" | "MODEL_INVALID" | "ERROR";

export interface SimulationResult {
  scenario_id: string;
  scenario_name: string;
  solver_status: SolverStatus;
  solver_duration_ms: number;
  input_snapshot_hash: string;
  objective_value_idr: number | null;
  scenario_date: string;
  cutoff_date: string;
  is_demo_data: boolean;
  production: { product_id: string; name: string; units: number; demand_units: number; unmet_units: number }[];
  purchases: {
    offer_id: string;
    supplier_id: string;
    material_id: string;
    packs: number;
    base_units: number;
    incremental_premium_idr: number;
  }[];
  material_usage: {
    material_id: string;
    name: string;
    base_unit: BaseUnit;
    stock_on_hand: number;
    committed_units: number;
    purchased_units: number;
    available_units: number;
    used_units: number;
    remaining_units: number;
    is_bottleneck: boolean;
  }[];
  kpis: { gross_contribution_idr: number; incremental_premium_idr: number; net_contribution_idr: number } | null;
  explanations: string[];
  warnings: string[];
}

export interface ComparisonResult {
  results: SimulationResult[];
  deltas: {
    from_scenario_id: string;
    to_scenario_id: string;
    net_contribution_delta_idr: number | null;
    net_contribution_delta_pct: number | null;
  }[];
  contribution_at_risk_idr: number | null;
  recovered_contribution_idr: number | null;
  recovery_pct: number | null;
  warnings: string[];
}

export type NetworkKind = "supplier" | "material" | "product";

export interface NetworkNode {
  id: string;
  entity_id: string;
  label: string;
  kind: NetworkKind;
  status: "active" | "inactive" | "single_source" | "stock_only" | "ready";
  detail: string;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  kind: "committed" | "alternative" | "bom";
  active: boolean;
}

export interface NetworkResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  material_dependencies: { material_id: string; supplier_ids: string[]; product_ids: string[] }[];
  single_source_risks: { material_id: string; supplier_id: string; product_ids: string[] }[];
  warnings: string[];
}
