from datetime import date, datetime
import re
from typing import Annotated, Literal, Self

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints, model_validator

MAX_QUANTITY = 1_000_000
MAX_UNIT_MONEY_IDR = 10_000_000
MAX_SUPPLIERS = 20
MAX_PRODUCTS = 20
MAX_MATERIALS = 30
MAX_LINKS = 100

Identifier = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Notes = Annotated[str, StringConstraints(max_length=500)]
Quantity = Annotated[int, Field(strict=True, ge=0, le=MAX_QUANTITY)]
PositiveQuantity = Annotated[int, Field(strict=True, ge=1, le=MAX_QUANTITY)]
Money = Annotated[int, Field(strict=True, ge=0, le=MAX_UNIT_MONEY_IDR)]
Boolean = Annotated[bool, Field(strict=True)]
UnitKind = Literal["mass", "volume", "count"]
BaseUnit = Literal["g", "ml", "pcs"]

_UNITS_BY_KIND = {"mass": "g", "volume": "ml", "count": "pcs"}


def _parse_day(value: object) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str) and re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        try:
            return date.fromisoformat(value)
        except ValueError:
            pass
    raise ValueError("Tanggal harus valid dan memakai format YYYY-MM-DD.")


def _parse_timestamp(value: object) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and "T" in value:
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            pass
    raise ValueError("Tanggal dan waktu harus valid dalam format ISO 8601.")


IsoDay = Annotated[date, BeforeValidator(_parse_day)]
IsoTimestamp = Annotated[datetime, BeforeValidator(_parse_timestamp)]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Business(InputModel):
    id: Identifier
    name: Name
    sector: Name
    currency: Literal["IDR"] = "IDR"
    planning_cutoff_date: IsoDay
    created_at: IsoTimestamp


class Supplier(InputModel):
    id: Identifier
    business_id: Identifier
    name: Name
    active: Boolean = True
    notes: Notes = ""


class Material(InputModel):
    id: Identifier
    business_id: Identifier
    name: Name
    unit_kind: UnitKind
    base_unit: BaseUnit
    stock_on_hand: Quantity

    @model_validator(mode="after")
    def validate_units(self) -> Self:
        if self.base_unit != _UNITS_BY_KIND[self.unit_kind]:
            raise ValueError("Satuan dasar tidak cocok dengan jenis satuan bahan.")
        return self


class Product(InputModel):
    id: Identifier
    business_id: Identifier
    name: Name
    demand_units: Quantity
    unit_contribution_idr: Money


class BOMItem(InputModel):
    product_id: Identifier
    material_id: Identifier
    quantity_per_product: PositiveQuantity


class CommittedDelivery(InputModel):
    id: Identifier
    supplier_id: Identifier
    material_id: Identifier
    quantity_base_units: PositiveQuantity
    arrival_date: IsoDay
    enabled_in_baseline: Boolean = True


class AlternativeOffer(InputModel):
    id: Identifier
    supplier_id: Identifier
    material_id: Identifier
    pack_size_base_units: PositiveQuantity
    max_packs: Quantity
    lead_days: Annotated[int, Field(strict=True, ge=0, le=365)]
    incremental_premium_idr_per_pack: Money
    enabled_in_scenario: Boolean = True


class Disruption(InputModel):
    type: Literal["supplier_outage"] = "supplier_outage"
    affected_supplier_ids: list[Identifier] = Field(min_length=1, max_length=MAX_SUPPLIERS)
    start_date: IsoDay
    end_date: IsoDay
    notes: Notes = ""

    @model_validator(mode="after")
    def validate_period(self) -> Self:
        if self.end_date < self.start_date:
            raise ValueError("Tanggal berakhirnya gangguan harus sama dengan atau setelah tanggal mulai.")
        _unique(set(self.affected_supplier_ids), len(self.affected_supplier_ids), "pemasok terdampak")
        return self


class Overrides(InputModel):
    stock_on_hand: dict[Identifier, Quantity] = Field(default_factory=dict, max_length=MAX_MATERIALS)
    demand_units: dict[Identifier, Quantity] = Field(default_factory=dict, max_length=MAX_PRODUCTS)
    max_packs: dict[Identifier, Quantity] = Field(default_factory=dict, max_length=MAX_LINKS)


class Scenario(InputModel):
    id: Identifier
    name: Name
    cutoff_date: IsoDay
    disabled_supplier_ids: list[Identifier] = Field(default_factory=list, max_length=MAX_SUPPLIERS)
    enabled_offer_ids: list[Identifier] = Field(default_factory=list, max_length=MAX_LINKS)
    overrides: Overrides = Field(default_factory=Overrides)
    disruptions: list[Disruption] = Field(default_factory=list, max_length=MAX_SUPPLIERS)
    source: Literal["demo", "user"] = "user"


def _unique(values: set, count: int, label: str) -> None:
    if len(values) != count:
        raise ValueError(f"Ada data duplikat pada {label}.")


def _references(values: set[str], available: set[str], label: str) -> None:
    if missing := values - available:
        missing_ids = ", ".join(sorted(missing))
        raise ValueError(f"ID berikut tidak ditemukan pada {label} ({missing_ids}).")


class Snapshot(InputModel):
    business: Business
    scenario_date: IsoDay
    demo_data: Boolean = False
    suppliers: list[Supplier] = Field(max_length=MAX_SUPPLIERS)
    materials: list[Material] = Field(min_length=1, max_length=MAX_MATERIALS)
    products: list[Product] = Field(min_length=1, max_length=MAX_PRODUCTS)
    bom: list[BOMItem] = Field(min_length=1, max_length=MAX_LINKS)
    committed_deliveries: list[CommittedDelivery] = Field(max_length=MAX_LINKS)
    alternative_offers: list[AlternativeOffer] = Field(max_length=MAX_LINKS)

    @model_validator(mode="after")
    def validate_entities(self) -> Self:
        supplier_ids = {item.id for item in self.suppliers}
        material_ids = {item.id for item in self.materials}
        product_ids = {item.id for item in self.products}
        _unique(supplier_ids, len(self.suppliers), "pemasok")
        _unique(material_ids, len(self.materials), "bahan")
        _unique(product_ids, len(self.products), "produk")
        _unique({item.id for item in self.committed_deliveries}, len(self.committed_deliveries), "pengiriman")
        _unique({item.id for item in self.alternative_offers}, len(self.alternative_offers), "penawaran")
        _unique({(item.product_id, item.material_id) for item in self.bom}, len(self.bom), "resep")

        if any(
            item.business_id != self.business.id
            for item in [*self.suppliers, *self.materials, *self.products]
        ):
            raise ValueError("Semua data pemasok, bahan, dan produk harus milik usaha yang sama.")

        recipe_products = {item.product_id for item in self.bom}
        _references(recipe_products, product_ids, "produk pada resep")
        _references({item.material_id for item in self.bom}, material_ids, "bahan pada resep")
        if missing := product_ids - recipe_products:
            raise ValueError(f"Resep kosong untuk produk {', '.join(sorted(missing))}.")

        supplies = [*self.committed_deliveries, *self.alternative_offers]
        _references({item.supplier_id for item in supplies}, supplier_ids, "pemasok pada pasokan")
        _references({item.material_id for item in supplies}, material_ids, "bahan pada pasokan")
        return self


def validate_scenario(snapshot: Snapshot, scenario: Scenario) -> None:
    if scenario.cutoff_date < snapshot.scenario_date:
        raise ValueError("Batas perencanaan harus sama dengan atau setelah tanggal simulasi.")
    disabled = set(scenario.disabled_supplier_ids)
    enabled = set(scenario.enabled_offer_ids)
    _unique(disabled, len(scenario.disabled_supplier_ids), "pemasok yang dinonaktifkan")
    _unique(enabled, len(scenario.enabled_offer_ids), "penawaran yang diaktifkan")

    supplier_ids = {item.id for item in snapshot.suppliers}
    offer_ids = {item.id for item in snapshot.alternative_offers}
    _references(disabled, supplier_ids, "pemasok yang dinonaktifkan")
    _references(enabled, offer_ids, "penawaran yang diaktifkan")
    for disruption in scenario.disruptions:
        _references(set(disruption.affected_supplier_ids), supplier_ids, "pemasok terdampak")

    override = scenario.overrides
    _references(set(override.stock_on_hand), {item.id for item in snapshot.materials}, "bahan pada perubahan stok")
    _references(set(override.demand_units), {item.id for item in snapshot.products}, "produk pada perubahan permintaan")
    _references(set(override.max_packs), offer_ids, "penawaran pada perubahan kapasitas")
