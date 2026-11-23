from collections import defaultdict
from hashlib import sha256
import json
import logging
from time import perf_counter

from app.schemas.models import Scenario, Snapshot
from app.services.scenario_inputs import ScenarioInputs, resolve_inputs

try:
    from ortools.sat.python import cp_model
except (ImportError, OSError):
    cp_model = None


logger = logging.getLogger(__name__)
REQUEST_SOLVE_LIMIT_SECONDS = 3.0


class SolverUnavailableError(RuntimeError):
    """The OR-Tools runtime cannot be imported."""


class InvalidSolutionError(RuntimeError):
    """The native solver returned a plan that failed independent verification."""


def _run_solver(model, time_limit_seconds: float):
    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = 1
    solver.parameters.max_time_in_seconds = time_limit_seconds
    return solver, solver.solve(model)


def solver_available() -> bool:
    if cp_model is None:
        return False
    try:
        model = cp_model.CpModel()
        variable = model.new_int_var(0, 1, "solver_readiness")
        model.maximize(variable)
        solver, status = _run_solver(model, 0.5)
        return status == cp_model.OPTIMAL and solver.value(variable) == 1
    except (RuntimeError, ValueError):
        return False


def _build_model(snapshot: Snapshot, inputs: ScenarioInputs):
    model = cp_model.CpModel()
    production = {
        product.id: model.new_int_var(0, inputs.demand_units[product.id], f"produce_{product.id}")
        for product in snapshot.products
    }
    purchase = {
        offer.id: model.new_int_var(0, inputs.offer_capacity[offer.id], f"buy_{offer.id}")
        for offer in snapshot.alternative_offers
    }
    usage = defaultdict(list)
    for item in snapshot.bom:
        usage[item.material_id].append(item.quantity_per_product * production[item.product_id])
    potential_purchases = defaultdict(list)
    for offer in snapshot.alternative_offers:
        potential_purchases[offer.material_id].append(offer.pack_size_base_units * purchase[offer.id])
    committed: dict[str, int] = defaultdict(int)
    for delivery in snapshot.committed_deliveries:
        committed[delivery.material_id] += inputs.delivery_units[delivery.id]

    for material_id, demand_terms in usage.items():
        base_stock = inputs.stock_on_hand[material_id] + committed[material_id]
        model.add(sum(demand_terms) <= base_stock + sum(potential_purchases[material_id]))

    normal_contribution = sum(
        product.unit_contribution_idr * production[product.id] for product in snapshot.products
    )
    extra_cost = sum(
        offer.incremental_premium_idr_per_pack * purchase[offer.id]
        for offer in snapshot.alternative_offers
    )
    model.maximize(normal_contribution - extra_cost)
    return model, production, purchase


def _verify_plan(
    snapshot: Snapshot,
    inputs: ScenarioInputs,
    produced: dict[str, int],
    purchased: dict[str, int],
    solver_objective: float,
):
    if any(
        type(units) is not int or not 0 <= units <= inputs.demand_units[product_id]
        for product_id, units in produced.items()
    ):
        raise InvalidSolutionError("production bounds")
    if any(
        type(packs) is not int or not 0 <= packs <= inputs.offer_capacity[offer_id]
        for offer_id, packs in purchased.items()
    ):
        raise InvalidSolutionError("purchase bounds")

    used: dict[str, int] = defaultdict(int)
    committed: dict[str, int] = defaultdict(int)
    purchased_units: dict[str, int] = defaultdict(int)
    for item in snapshot.bom:
        used[item.material_id] += item.quantity_per_product * produced[item.product_id]
    for delivery in snapshot.committed_deliveries:
        committed[delivery.material_id] += inputs.delivery_units[delivery.id]
    for offer in snapshot.alternative_offers:
        purchased_units[offer.material_id] += offer.pack_size_base_units * purchased[offer.id]

    remaining = {
        material.id: inputs.stock_on_hand[material.id] + committed[material.id]
        + purchased_units[material.id] - used[material.id]
        for material in snapshot.materials
    }
    if any(units < 0 for units in remaining.values()):
        raise InvalidSolutionError("material balance")

    # Dropping surplus free packs preserves feasibility and the objective value.
    for offer in snapshot.alternative_offers:
        if offer.incremental_premium_idr_per_pack == 0:
            removable = min(purchased[offer.id], remaining[offer.material_id] // offer.pack_size_base_units)
            purchased[offer.id] -= removable
            unused_units = removable * offer.pack_size_base_units
            remaining[offer.material_id] -= unused_units
            purchased_units[offer.material_id] -= unused_units

    gross = sum(product.unit_contribution_idr * produced[product.id] for product in snapshot.products)
    premium = sum(
        offer.incremental_premium_idr_per_pack * purchased[offer.id]
        for offer in snapshot.alternative_offers
    )
    net = gross - premium
    # The schema bounds the exact integer calculation below 2**53, where the solver's float is exact.
    if solver_objective != net:
        raise InvalidSolutionError("objective verification")

    max_remaining = remaining.copy()
    for offer in snapshot.alternative_offers:
        unused_capacity = inputs.offer_capacity[offer.id] - purchased[offer.id]
        max_remaining[offer.material_id] += unused_capacity * offer.pack_size_base_units
    bottlenecks = {
        item.material_id
        for item in snapshot.bom
        if produced[item.product_id] < inputs.demand_units[item.product_id]
        and item.quantity_per_product > max_remaining[item.material_id]
    }
    return {
        "objective_value_idr": net,
        "kpis": {
            "gross_contribution_idr": gross,
            "incremental_premium_idr": premium,
            "net_contribution_idr": net,
        },
        "production": [
            {
                "product_id": product.id,
                "name": product.name,
                "units": produced[product.id],
                "demand_units": inputs.demand_units[product.id],
                "unmet_units": inputs.demand_units[product.id] - produced[product.id],
            }
            for product in snapshot.products
        ],
        "purchases": [
            {
                "offer_id": offer.id,
                "supplier_id": offer.supplier_id,
                "material_id": offer.material_id,
                "packs": purchased[offer.id],
                "base_units": offer.pack_size_base_units * purchased[offer.id],
                "incremental_premium_idr": offer.incremental_premium_idr_per_pack * purchased[offer.id],
            }
            for offer in snapshot.alternative_offers
            if purchased[offer.id] > 0
        ],
        "material_usage": [
            {
                "material_id": material.id,
                "name": material.name,
                "base_unit": material.base_unit,
                "stock_on_hand": inputs.stock_on_hand[material.id],
                "committed_units": committed[material.id],
                "purchased_units": purchased_units[material.id],
                "available_units": used[material.id] + remaining[material.id],
                "used_units": used[material.id],
                "remaining_units": remaining[material.id],
                "is_bottleneck": material.id in bottlenecks,
            }
            for material in snapshot.materials
        ],
    }


WARNINGS_BY_STATUS = {
    "FEASIBLE": "Rencana memenuhi batas model. Optimalitasnya belum terbukti.",
    "UNKNOWN": "Solver berhenti sebelum menemukan rencana yang dapat digunakan.",
    "INFEASIBLE": "Solver tidak menemukan rencana yang memenuhi batas model.",
    "MODEL_INVALID": "Model optimasi tidak dapat diproses. Periksa ukuran dan nilai input.",
    "ERROR": "Rencana produksi tidak dapat dihitung atau diverifikasi. Coba lagi.",
}


def solve(snapshot: Snapshot, scenario: Scenario, *, time_limit_seconds: float = REQUEST_SOLVE_LIMIT_SECONDS):
    if cp_model is None:
        raise SolverUnavailableError("OR-Tools CP-SAT tidak tersedia.")

    inputs = resolve_inputs(snapshot, scenario)
    payload = {"snapshot": snapshot.model_dump(mode="json"), "scenario": scenario.model_dump(mode="json")}
    fingerprint = sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()
    result = {
        "scenario_id": scenario.id,
        "scenario_name": scenario.name,
        "scenario_date": snapshot.scenario_date,
        "cutoff_date": scenario.cutoff_date,
        "input_snapshot_hash": fingerprint,
        "calculation_basis": "single_batch_deterministic_model",
        "is_demo_data": snapshot.demo_data,
        "kpis": None,
        "objective_value_idr": None,
        "production": [],
        "purchases": [],
        "material_usage": [],
        "explanations": inputs.disruptions,
        "warnings": inputs.warnings,
    }
    started = perf_counter()
    try:
        model, production, purchase = _build_model(snapshot, inputs)
        solver, status = _run_solver(model, time_limit_seconds)
        result["solver_status"] = solver.status_name(status)
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            plan = _verify_plan(
                snapshot,
                inputs,
                {product_id: solver.value(variable) for product_id, variable in production.items()},
                {offer_id: solver.value(variable) for offer_id, variable in purchase.items()},
                solver.objective_value,
            )
            result.update(plan)
    except (RuntimeError, ValueError) as error:
        logger.error("CP-SAT plan processing failed (%s)", type(error).__name__)
        result["solver_status"] = "ERROR"
    result["solver_duration_ms"] = round((perf_counter() - started) * 1_000, 2)

    warning = WARNINGS_BY_STATUS.get(result["solver_status"])
    if warning:
        result["warnings"].append(warning)
    if result["kpis"] is not None:
        result["explanations"].extend(_explain_plan(result, snapshot))
    return result


def _explain_plan(result, snapshot: Snapshot) -> list[str]:
    explanations = [
        f"Permintaan {product['name']} yang belum terpenuhi sebanyak {product['unmet_units']} unit."
        for product in result["production"]
        if product["unmet_units"]
    ]
    for resource in result["material_usage"]:
        if resource["is_bottleneck"]:
            explanations.append(f"Pasokan {resource['name']} membatasi tambahan produksi pada rencana ini.")
    supplier_names = {supplier.id: supplier.name for supplier in snapshot.suppliers}
    material_names = {material.id: material.name for material in snapshot.materials}
    for purchase in result["purchases"]:
        supplier = supplier_names[purchase["supplier_id"]]
        material = material_names[purchase["material_id"]]
        explanations.append(f"Rencana memakai {purchase['packs']} pak {material} dari {supplier}.")
    if not explanations:
        explanations.append("Stok dan pengiriman yang dipakai pada rencana ini memenuhi semua permintaan.")
    return explanations
