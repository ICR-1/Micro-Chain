from datetime import date
from typing import Literal

from pydantic import BaseModel

from .models import BaseUnit, Scenario, Snapshot


class Health(BaseModel):
    status: Literal["ok", "unavailable"]
    solver_available: bool


class DemoData(BaseModel):
    snapshot: Snapshot
    scenarios: list[Scenario]
    demo_data: Literal[True]


class NetworkNode(BaseModel):
    id: str
    entity_id: str
    label: str
    kind: Literal["supplier", "material", "product"]
    status: Literal["active", "inactive", "single_source", "stock_only", "ready"]
    detail: str


class NetworkEdge(BaseModel):
    id: str
    source: str
    target: str
    kind: Literal["committed", "alternative", "bom"]
    active: bool


class MaterialDependency(BaseModel):
    material_id: str
    supplier_ids: list[str]
    product_ids: list[str]


class SingleSourceRisk(BaseModel):
    material_id: str
    supplier_id: str
    product_ids: list[str]


class NetworkAnalysis(BaseModel):
    nodes: list[NetworkNode]
    edges: list[NetworkEdge]
    material_dependencies: list[MaterialDependency]
    single_source_risks: list[SingleSourceRisk]
    warnings: list[str]


class Production(BaseModel):
    product_id: str
    name: str
    units: int
    demand_units: int
    unmet_units: int


class Purchase(BaseModel):
    offer_id: str
    supplier_id: str
    material_id: str
    packs: int
    base_units: int
    incremental_premium_idr: int


class MaterialUsage(BaseModel):
    material_id: str
    name: str
    base_unit: BaseUnit
    stock_on_hand: int
    committed_units: int
    purchased_units: int
    available_units: int
    used_units: int
    remaining_units: int
    is_bottleneck: bool


class SimulationKPIs(BaseModel):
    gross_contribution_idr: int
    incremental_premium_idr: int
    net_contribution_idr: int


class SimulationResult(BaseModel):
    scenario_id: str
    scenario_name: str
    solver_status: Literal["OPTIMAL", "FEASIBLE", "UNKNOWN", "INFEASIBLE", "MODEL_INVALID", "ERROR"]
    production: list[Production]
    purchases: list[Purchase]
    material_usage: list[MaterialUsage]
    kpis: SimulationKPIs | None
    objective_value_idr: int | None
    input_snapshot_hash: str
    solver_duration_ms: float
    scenario_date: date
    cutoff_date: date
    warnings: list[str]
    explanations: list[str]
    calculation_basis: Literal["single_batch_deterministic_model"]
    is_demo_data: bool


class ComparisonDelta(BaseModel):
    from_scenario_id: str
    to_scenario_id: str
    net_contribution_delta_idr: int | None
    net_contribution_delta_pct: float | None


class ComparisonResult(BaseModel):
    results: list[SimulationResult]
    deltas: list[ComparisonDelta]
    contribution_at_risk_idr: int | None
    recovered_contribution_idr: int | None
    recovery_pct: float | None
    warnings: list[str]


class HTTPFailure(BaseModel):
    detail: str


class ValidationIssue(BaseModel):
    loc: list[str | int]
    msg: str
    type: str


class ValidationFailure(BaseModel):
    detail: list[ValidationIssue]
