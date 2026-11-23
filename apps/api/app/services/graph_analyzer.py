from collections import defaultdict

from app.schemas.models import Material, Product, Scenario, Snapshot, Supplier
from app.services.scenario_inputs import resolve_inputs


def analyze_network(snapshot: Snapshot, scenario: Scenario):
    inputs = resolve_inputs(snapshot, scenario)
    edges = []
    suppliers_per_material: dict[str, set[str]] = defaultdict(set)
    available_units = inputs.stock_on_hand.copy()
    active_suppliers = set()
    products_per_material: dict[str, list[str]] = defaultdict(list)
    unready_products: set[str] = set()

    def supply_edge(kind: str, supply_id: str, supplier_id: str, material_id: str, units: int) -> None:
        if units > 0:
            suppliers_per_material[material_id].add(supplier_id)
            active_suppliers.add(supplier_id)
            available_units[material_id] += units
        edges.append({
            "id": f"{kind}:{supply_id}",
            "source": f"supplier:{supplier_id}",
            "target": f"material:{material_id}",
            "kind": kind,
            "active": units > 0,
        })

    for delivery in snapshot.committed_deliveries:
        supply_edge(
            "committed", delivery.id, delivery.supplier_id, delivery.material_id,
            inputs.delivery_units[delivery.id],
        )
    for offer in snapshot.alternative_offers:
        supply_edge(
            "alternative", offer.id, offer.supplier_id, offer.material_id,
            inputs.offer_capacity[offer.id] * offer.pack_size_base_units,
        )
    for item in snapshot.bom:
        products_per_material[item.material_id].append(item.product_id)
        if available_units[item.material_id] < item.quantity_per_product:
            unready_products.add(item.product_id)
        edges.append({
            "id": f"bom:{item.material_id}:{item.product_id}",
            "source": f"material:{item.material_id}",
            "target": f"product:{item.product_id}",
            "kind": "bom",
            "active": True,
        })

    nodes = []
    for supplier in snapshot.suppliers:
        active = supplier.id in active_suppliers
        detail = "Pasokan memenuhi batas skenario." if active else "Pasokan tidak dihitung dalam skenario ini."
        nodes.append(_node(supplier, "supplier", "active" if active else "inactive", detail))

    dependencies = []
    risks = []
    warnings = [*inputs.disruptions, *inputs.warnings]
    supplier_names = {supplier.id: supplier.name for supplier in snapshot.suppliers}
    for material in snapshot.materials:
        supplier_ids = sorted(suppliers_per_material[material.id])
        product_ids = sorted(products_per_material[material.id])
        stock = inputs.stock_on_hand[material.id]
        if len(supplier_ids) == 1:
            status = "single_source"
            supplier_id = supplier_ids[0]
            risks.append({"material_id": material.id, "supplier_id": supplier_id, "product_ids": product_ids})
            warnings.append(f"{material.name} bergantung pada satu pemasok aktif, {supplier_names[supplier_id]}.")
        elif supplier_ids:
            status = "ready"
        elif stock > 0:
            status = "stock_only"
        else:
            status = "inactive"
            if product_ids:
                warnings.append(f"{material.name} tidak memiliki stok atau pemasok aktif dalam skenario ini.")

        stock_label = f"{stock:,}".replace(",", ".")
        detail = f"{len(supplier_ids)} pemasok masuk perhitungan. Stok awal {stock_label} {material.base_unit}."
        nodes.append(_node(material, "material", status, detail))
        dependencies.append({"material_id": material.id, "supplier_ids": supplier_ids, "product_ids": product_ids})

    for product in snapshot.products:
        ready = product.id not in unready_products
        detail = (
            "Pasokan potensial mencukupi kebutuhan bahan untuk satu unit."
            if ready else "Pasokan potensial belum mencukupi kebutuhan bahan untuk satu unit."
        )
        nodes.append(_node(product, "product", "ready" if ready else "inactive", detail))

    return {
        "nodes": nodes,
        "edges": edges,
        "material_dependencies": dependencies,
        "single_source_risks": risks,
        "warnings": warnings,
    }


def _node(entity: Supplier | Material | Product, kind: str, status: str, detail: str) -> dict[str, str]:
    return {
        "id": f"{kind}:{entity.id}",
        "entity_id": entity.id,
        "kind": kind,
        "label": entity.name,
        "status": status,
        "detail": detail,
    }
