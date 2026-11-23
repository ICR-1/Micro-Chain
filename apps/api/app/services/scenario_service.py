from app.schemas.models import Scenario, Snapshot
from app.services.optimizer import REQUEST_SOLVE_LIMIT_SECONDS, solve


def compare_scenarios(snapshot: Snapshot, scenarios: list[Scenario]):
    time_limit = REQUEST_SOLVE_LIMIT_SECONDS / len(scenarios)
    results = [solve(snapshot, scenario, time_limit_seconds=time_limit) for scenario in scenarios]
    net_values = {
        result["scenario_id"]: result["kpis"]["net_contribution_idr"] if result["kpis"] is not None else None
        for result in results
    }
    deltas = []
    for first, second in zip(scenarios, scenarios[1:]):
        previous, current = net_values[first.id], net_values[second.id]
        delta = current - previous if previous is not None and current is not None else None
        deltas.append({
            "from_scenario_id": first.id,
            "to_scenario_id": second.id,
            "net_contribution_delta_idr": delta,
            "net_contribution_delta_pct": _percentage(delta, previous),
        })

    baseline, outage, mitigation = (net_values.get(role) for role in ("baseline", "outage", "mitigation"))
    contribution_at_risk = max(0, baseline - outage) if baseline is not None and outage is not None else None
    recovered = mitigation - outage if mitigation is not None and outage is not None else None
    recovery = _percentage(recovered, contribution_at_risk)

    warnings = []
    if any(result["kpis"] is None for result in results):
        warnings.append("Selisih untuk skenario yang belum memiliki rencana tidak dapat dihitung.")
    if any(result["solver_status"] == "FEASIBLE" for result in results):
        warnings.append("Sebagian selisih memakai rencana yang optimalitasnya belum terbukti.")
    if recovered is not None and recovered < 0:
        warnings.append("Skenario mitigasi menghasilkan estimasi kontribusi lebih rendah daripada skenario gangguan.")
    return {
        "results": results,
        "deltas": deltas,
        "contribution_at_risk_idr": contribution_at_risk,
        "recovered_contribution_idr": recovered,
        "recovery_pct": recovery,
        "warnings": warnings,
    }


def _percentage(delta: int | None, reference: int | None) -> float | None:
    return delta * 100 / reference if reference and delta is not None else None
