from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

from app.schemas.models import Scenario, Snapshot


@dataclass
class ScenarioInputs:
    stock_on_hand: dict[str, int]
    demand_units: dict[str, int]
    delivery_units: dict[str, int]
    offer_capacity: dict[str, int]
    warnings: list[str]
    disruptions: list[str]


def resolve_inputs(snapshot: Snapshot, scenario: Scenario) -> ScenarioInputs:
    suppliers = {supplier.id: supplier for supplier in snapshot.suppliers}
    disabled = set(scenario.disabled_supplier_ids)
    active_offers = set(scenario.enabled_offer_ids)
    outage_periods: dict[str, list[tuple[date, date]]] = defaultdict(list)
    disruptions = [
        f"{supplier.name} dinonaktifkan dalam skenario ini."
        for supplier in snapshot.suppliers
        if supplier.id in disabled
    ]
    for outage in scenario.disruptions:
        for supplier_id in outage.affected_supplier_ids:
            outage_periods[supplier_id].append((outage.start_date, outage.end_date))

    def supplier_available(supplier_id: str, start: date, end: date) -> bool:
        if supplier_id in disabled or not suppliers[supplier_id].active:
            return False
        return not any(
            start <= outage_end and outage_start <= end
            for outage_start, outage_end in outage_periods[supplier_id]
        )

    delivery_units: dict[str, int] = {}
    for delivery in snapshot.committed_deliveries:
        delivery_units[delivery.id] = 0
        arrival = delivery.arrival_date
        if not delivery.enabled_in_baseline or arrival > scenario.cutoff_date:
            continue
        if supplier_available(delivery.supplier_id, arrival, arrival):
            delivery_units[delivery.id] = delivery.quantity_base_units
        elif delivery.supplier_id not in disabled:
            name = suppliers[delivery.supplier_id].name
            disruptions.append(f"Pengiriman dari {name} pada {arrival.isoformat()} tidak tersedia.")

    warnings = []
    offer_capacity: dict[str, int] = {}
    material_names = {material.id: material.name for material in snapshot.materials}
    days_until_cutoff = (scenario.cutoff_date - snapshot.scenario_date).days
    for offer in snapshot.alternative_offers:
        offer_capacity[offer.id] = 0
        if offer.id not in active_offers:
            continue
        label = f"Penawaran {material_names[offer.material_id]} dari {suppliers[offer.supplier_id].name}"
        if not offer.enabled_in_scenario:
            warnings.append(f"{label} dinonaktifkan pada data pasokan.")
            continue
        if offer.lead_days > days_until_cutoff:
            warnings.append(f"{label} tiba setelah batas waktu produksi.")
            continue
        arrival = snapshot.scenario_date + timedelta(days=offer.lead_days)
        if not supplier_available(offer.supplier_id, snapshot.scenario_date, arrival):
            warnings.append(f"{label} tidak tersedia selama waktu pemesanan dan pengiriman.")
            continue
        offer_capacity[offer.id] = scenario.overrides.max_packs.get(offer.id, offer.max_packs)

    return ScenarioInputs(
        stock_on_hand={
            material.id: scenario.overrides.stock_on_hand.get(material.id, material.stock_on_hand)
            for material in snapshot.materials
        },
        demand_units={
            product.id: scenario.overrides.demand_units.get(product.id, product.demand_units)
            for product in snapshot.products
        },
        delivery_units=delivery_units,
        offer_capacity=offer_capacity,
        warnings=warnings,
        disruptions=list(dict.fromkeys(disruptions)),
    )
