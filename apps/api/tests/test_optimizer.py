import json
from datetime import timedelta
from importlib import import_module
from pathlib import Path

import pytest


@pytest.fixture
def optimizer():
    return import_module("app.services.optimizer")


@pytest.fixture
def demo():
    from app.schemas.models import Scenario, Snapshot

    fixture = Path(__file__).parents[1] / "app" / "data" / "demo_dapur_sari.json"
    source = json.loads(fixture.read_text(encoding="utf-8"))
    return Snapshot.model_validate(source["snapshot"]), {
        scenario["id"]: Scenario.model_validate(scenario) for scenario in source["scenarios"]
    }


def test_solver_health_requires_a_real_solution(optimizer):
    assert optimizer.solver_available()


@pytest.mark.parametrize(
    ("scenario_id", "bread", "cookies", "flour", "packs", "gross", "premium", "net", "bottleneck"),
    [
        ("baseline", 100, 30, 28_000, 0, 450_000, 0, 450_000, False),
        ("outage", 20, 30, 8_000, 0, 210_000, 0, 210_000, True),
        ("mitigation", 68, 30, 20_000, 12, 354_000, 12_000, 342_000, True),
    ],
)
def test_dapur_sari_exact_results(
    optimizer, demo, scenario_id, bread, cookies, flour, packs, gross, premium, net, bottleneck
):
    snapshot, scenarios = demo
    result = optimizer.solve(snapshot, scenarios[scenario_id])
    assert result["solver_status"] == "OPTIMAL"
    assert {p["product_id"]: p["units"] for p in result["production"]} == {
        "bread": bread, "cookies": cookies,
    }
    assert result["kpis"] == {
        "gross_contribution_idr": gross,
        "incremental_premium_idr": premium,
        "net_contribution_idr": net,
    }
    assert result["objective_value_idr"] == net
    flour_usage = next(m for m in result["material_usage"] if m["material_id"] == "flour")
    assert flour_usage["used_units"] == flour
    assert flour_usage["is_bottleneck"] == bottleneck
    assert sum(purchase["packs"] for purchase in result["purchases"]) == packs
    assert sum(purchase["base_units"] for purchase in result["purchases"]) == packs * 1_000
    for production in result["production"]:
        assert type(production["units"]) is int
        assert 0 <= production["units"] <= production["demand_units"]
    for usage in result["material_usage"]:
        assert usage["available_units"] == (
            usage["stock_on_hand"] + usage["committed_units"] + usage["purchased_units"]
        )
        assert usage["used_units"] <= usage["available_units"]


def test_comparison_recovers_55_percent_of_the_loss(demo):
    from app.services.scenario_service import compare_scenarios

    snapshot, scenarios = demo
    result = compare_scenarios(snapshot, list(scenarios.values()))
    assert result["contribution_at_risk_idr"] == 240_000
    assert result["recovered_contribution_idr"] == 132_000
    assert result["recovery_pct"] == 55
    assert [delta["net_contribution_delta_idr"] for delta in result["deltas"]] == [-240_000, 132_000]


def test_comparison_has_no_recovery_percentage_without_a_loss(demo):
    from app.services.scenario_service import compare_scenarios

    snapshot, scenarios = demo
    snapshot.materials[0].stock_on_hand = 40_000
    result = compare_scenarios(snapshot, list(scenarios.values()))
    assert result["contribution_at_risk_idr"] == 0
    assert result["recovered_contribution_idr"] == 0
    assert result["recovery_pct"] is None


def test_disabled_supplier_contributes_no_deliveries_or_offers(optimizer, demo):
    snapshot, scenarios = demo
    scenario = scenarios["mitigation"]
    scenario.disabled_supplier_ids = ["supplier_a", "supplier_b"]
    result = optimizer.solve(snapshot, scenario)
    assert result["kpis"]["net_contribution_idr"] == 210_000
    assert result["purchases"] == []
    flour = next(m for m in result["material_usage"] if m["material_id"] == "flour")
    assert flour["committed_units"] == 0
    assert flour["purchased_units"] == 0


def test_inactive_supplier_cannot_fulfill_an_enabled_offer(optimizer, demo):
    snapshot, scenarios = demo
    next(s for s in snapshot.suppliers if s.id == "supplier_b").active = False
    result = optimizer.solve(snapshot, scenarios["mitigation"])
    assert result["kpis"]["net_contribution_idr"] == 210_000
    assert result["purchases"] == []


def test_offer_arriving_after_cutoff_cannot_be_purchased(optimizer, demo):
    snapshot, scenarios = demo
    snapshot.alternative_offers[0].lead_days = 2
    result = optimizer.solve(snapshot, scenarios["mitigation"])
    assert result["purchases"] == []
    assert result["kpis"]["net_contribution_idr"] == 210_000


def test_outage_dates_gate_scheduled_deliveries_by_their_arrival(optimizer, demo):
    from app.schemas.models import Disruption

    snapshot, scenarios = demo
    scenario = scenarios["baseline"]
    arrival = snapshot.committed_deliveries[0].arrival_date
    scenario.disruptions = [Disruption(
        type="supplier_outage", affected_supplier_ids=["supplier_a"],
        start_date=arrival, end_date=arrival,
    )]
    result = optimizer.solve(snapshot, scenario)
    assert result["kpis"]["net_contribution_idr"] == 210_000
    scenario.disruptions[0].start_date = scenario.disruptions[0].end_date = arrival.replace(year=2027)
    result = optimizer.solve(snapshot, scenario)
    assert result["kpis"]["net_contribution_idr"] == 450_000


@pytest.mark.parametrize("day", [0, 1, 2])
def test_supplier_outage_during_order_and_arrival_blocks_an_offer(optimizer, demo, day):
    from app.schemas.models import Disruption

    snapshot, scenarios = demo
    scenario = scenarios["mitigation"]
    scenario.cutoff_date = snapshot.scenario_date + timedelta(days=2)
    snapshot.alternative_offers[0].lead_days = 2
    outage_date = snapshot.scenario_date + timedelta(days=day)
    scenario.disruptions = [Disruption(
        type="supplier_outage", affected_supplier_ids=["supplier_b"],
        start_date=outage_date, end_date=outage_date,
    )]
    result = optimizer.solve(snapshot, scenario)
    assert result["purchases"] == []
    assert result["kpis"]["net_contribution_idr"] == 210_000


def test_scenario_capacity_override_limits_alternative_purchase(optimizer, demo):
    snapshot, scenarios = demo
    scenario = scenarios["mitigation"]
    scenario.overrides.max_packs["supplier_b_flour"] = 1
    result = optimizer.solve(snapshot, scenario)
    assert result["purchases"][0]["packs"] == 1
    assert result["kpis"]["net_contribution_idr"] == 221_000


def test_bottleneck_tracks_a_different_material_when_its_stock_runs_out(optimizer, demo):
    snapshot, scenarios = demo
    scenario = scenarios["baseline"]
    scenario.overrides.stock_on_hand["sugar"] = 0
    result = optimizer.solve(snapshot, scenario)
    assert {row["material_id"] for row in result["material_usage"] if row["is_bottleneck"]} == {"sugar"}
    assert all(row["units"] == 0 for row in result["production"])


def test_zero_stock_without_supplies_has_a_real_zero_plan(optimizer, demo):
    snapshot, scenarios = demo
    scenario = scenarios["outage"]
    scenario.overrides.stock_on_hand = {material.id: 0 for material in snapshot.materials}
    result = optimizer.solve(snapshot, scenario)
    assert result["solver_status"] == "OPTIMAL"
    assert all(row["units"] == 0 for row in result["production"])
    assert result["kpis"]["net_contribution_idr"] == 0


def test_demand_override_changes_plan_and_input_hash(optimizer, demo):
    snapshot, scenarios = demo
    scenario = scenarios["baseline"]
    before = optimizer.solve(snapshot, scenario)
    scenario.overrides.demand_units["bread"] = 10
    after = optimizer.solve(snapshot, scenario)
    assert after["kpis"]["net_contribution_idr"] == 180_000
    assert after["input_snapshot_hash"] != before["input_snapshot_hash"]


def test_free_offer_does_not_buy_packs_with_no_demand(optimizer, demo):
    snapshot, scenarios = demo
    snapshot.alternative_offers[0].incremental_premium_idr_per_pack = 0
    scenario = scenarios["mitigation"]
    scenario.overrides.demand_units = {product.id: 0 for product in snapshot.products}
    result = optimizer.solve(snapshot, scenario)
    assert result["solver_status"] == "OPTIMAL"
    assert result["purchases"] == []


def test_graph_keeps_inactive_links_separate_from_source_risk(demo):
    from app.services.graph_analyzer import analyze_network

    snapshot, scenarios = demo
    baseline = analyze_network(snapshot, scenarios["baseline"])
    outage = analyze_network(snapshot, scenarios["outage"])
    mitigation = analyze_network(snapshot, scenarios["mitigation"])
    assert baseline["single_source_risks"] == [
        {"material_id": "flour", "supplier_id": "supplier_a", "product_ids": ["bread", "cookies"]},
    ]
    assert outage["single_source_risks"] == []
    assert mitigation["single_source_risks"][0]["supplier_id"] == "supplier_b"
    assert any(
        edge["source"] == "supplier:supplier_b" and edge["target"] == "material:flour"
        and edge["kind"] == "alternative" and not edge["active"]
        for edge in baseline["edges"]
    )
    assert any(
        edge["source"] == "material:flour" and edge["target"] == "product:bread"
        and edge["kind"] == "bom" and edge["active"]
        for edge in baseline["edges"]
    )


@pytest.mark.parametrize(("solver_status", "has_plan"), [
    ("FEASIBLE", True), ("UNKNOWN", False), ("INFEASIBLE", False), ("MODEL_INVALID", False),
])
def test_solver_status_is_reported_without_promoting_it(optimizer, demo, monkeypatch, solver_status, has_plan):
    snapshot, scenarios = demo
    real_run_solver = optimizer._run_solver

    def run_solver(model, time_limit_seconds):
        solver, _ = real_run_solver(model, time_limit_seconds)
        return solver, getattr(optimizer.cp_model, solver_status)

    monkeypatch.setattr(optimizer, "_run_solver", run_solver)
    result = optimizer.solve(snapshot, scenarios["baseline"])
    assert result["solver_status"] == solver_status
    assert (result["kpis"] is not None) is has_plan
    assert bool(result["production"]) is has_plan
    assert result["warnings"]


def test_native_solver_error_has_no_fabricated_plan(optimizer, demo, monkeypatch):
    snapshot, scenarios = demo

    def fail_solver(*_):
        raise RuntimeError("solver execution failed")

    monkeypatch.setattr(optimizer, "_run_solver", fail_solver)
    result = optimizer.solve(snapshot, scenarios["baseline"])
    assert result["solver_status"] == "ERROR"
    assert result["kpis"] is None
    assert result["production"] == []


def test_independent_verification_rejects_a_plan_exceeding_available_flour(optimizer, demo, monkeypatch):
    snapshot, scenarios = demo
    real_run_solver = optimizer._run_solver

    def run_solver(model, time_limit_seconds):
        solver, status = real_run_solver(model, time_limit_seconds)
        native_value = solver.value
        monkeypatch.setattr(solver, "value", lambda var: 100 if var.name == "produce_bread" else native_value(var))
        return solver, status

    monkeypatch.setattr(optimizer, "_run_solver", run_solver)
    result = optimizer.solve(snapshot, scenarios["outage"])
    assert result["solver_status"] == "ERROR"
    assert result["kpis"] is None
    assert result["material_usage"] == []
