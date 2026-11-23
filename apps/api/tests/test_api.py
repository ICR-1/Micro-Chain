from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from app.main import app, create_app
from app.services import optimizer


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def demo(client):
    response = client.get("/api/v1/demo")
    assert response.status_code == 200
    return response.json()


def test_health_uses_live_solver(client, monkeypatch):
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "solver_available": True}

    monkeypatch.setattr(optimizer, "solver_available", lambda: False)
    unavailable = client.get("/health")
    assert unavailable.status_code == 503
    assert unavailable.json()["solver_available"] is False


def test_demo_snapshot(client, demo):
    assert demo["demo_data"] is True
    assert demo["snapshot"]["business"]["name"] == "Dapur Sari"
    assert demo["snapshot"]["demo_data"] is True
    assert [scenario["id"] for scenario in demo["scenarios"]] == [
        "baseline", "outage", "mitigation",
    ]
    assert "SimulationResult" in client.get("/openapi.json").json()["components"]["schemas"]


def test_network_analysis_reports_flour_risk(client, demo):
    response = client.post(
        "/api/v1/network/analyze",
        json={"snapshot": demo["snapshot"], "scenario": demo["scenarios"][0]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["single_source_risks"] == [
        {"material_id": "flour", "supplier_id": "supplier_a", "product_ids": ["bread", "cookies"]},
    ]
    assert any(edge["kind"] == "bom" and edge["active"] for edge in data["edges"])


def test_simulation_reacts_to_inventory_and_demand(client, demo):
    body = {"snapshot": demo["snapshot"], "scenario": demo["scenarios"][1]}
    original = client.post("/api/v1/simulations/preview", json=body)
    assert original.status_code == 200
    assert original.json()["kpis"]["net_contribution_idr"] == 210_000
    body["snapshot"]["materials"][0]["stock_on_hand"] = 9_000
    body["snapshot"]["products"][1]["demand_units"] = 25
    updated = client.post("/api/v1/simulations/preview", json=body)
    assert updated.status_code == 200
    assert updated.json()["kpis"]["net_contribution_idr"] == 203_000
    assert updated.json()["input_snapshot_hash"] != original.json()["input_snapshot_hash"]


def test_compare_three_and_two_scenarios(client, demo):
    url = "/api/v1/simulations/compare"
    response = client.post(url, json={"snapshot": demo["snapshot"], "scenarios": demo["scenarios"]})
    assert response.status_code == 200
    data = response.json()
    assert [item["kpis"]["net_contribution_idr"] for item in data["results"]] == [
        450_000, 210_000, 342_000,
    ]
    assert data["contribution_at_risk_idr"] == 240_000
    assert data["recovered_contribution_idr"] == 132_000
    assert data["recovery_pct"] == 55
    two = client.post(url, json={"snapshot": demo["snapshot"], "scenarios": demo["scenarios"][:2]})
    assert two.status_code == 200
    assert len(two.json()["results"]) == 2
    assert two.json()["recovery_pct"] is None


@pytest.mark.parametrize(
    ("change", "expected"),
    [
        (lambda s: s.update(bom=[]), "daftar"),
        (lambda s: s["bom"][0].update(material_id="missing"), "bahan"),
        (lambda s: s["materials"][0].update(stock_on_hand=-1), "minimal"),
        (lambda s: s["materials"][0].update(stock_on_hand=2.5), "bilangan bulat"),
        (lambda s: s["materials"][0].update(base_unit="ml"), "satuan"),
        (lambda s: s.update(scenario_date="2026-02-30"), "tanggal"),
        (lambda s: s["materials"].append(deepcopy(s["materials"][0])), "duplikat"),
        (lambda s: s["bom"].append(deepcopy(s["bom"][0])), "duplikat"),
    ],
)
def test_invalid_snapshot_returns_indonesian_validation(client, demo, change, expected):
    change(demo["snapshot"])
    response = client.post(
        "/api/v1/simulations/preview",
        json={"snapshot": demo["snapshot"], "scenario": demo["scenarios"][0]},
    )
    assert response.status_code == 422
    assert expected in response.json()["detail"][0]["msg"].lower()
    assert "input" not in response.json()["detail"][0]


def test_rejects_unknown_scenario_references(client, demo):
    scenario = demo["scenarios"][0]
    scenario["overrides"]["stock_on_hand"]["asing"] = 10_000
    response = client.post(
        "/api/v1/simulations/preview",
        json={"snapshot": demo["snapshot"], "scenario": scenario},
    )
    assert response.status_code == 422
    assert "stok" in response.json()["detail"][0]["msg"].lower()


def test_solver_unavailable_returns_503(client, demo, monkeypatch):
    def unavailable(*_):
        raise optimizer.SolverUnavailableError()

    monkeypatch.setattr(optimizer, "solve", unavailable)
    response = client.post(
        "/api/v1/simulations/preview",
        json={"snapshot": demo["snapshot"], "scenario": demo["scenarios"][0]},
    )
    assert response.status_code == 503
    assert "solver" in response.json()["detail"].lower()


def test_compute_rate_limit_and_cors(demo):
    client = TestClient(create_app(rate_limit=1))
    url = "/api/v1/network/analyze"
    body = {"snapshot": demo["snapshot"], "scenario": demo["scenarios"][0]}
    headers = {"Origin": "http://127.0.0.1:3000"}
    assert client.post(url, json=body, headers=headers).status_code == 200
    limited = client.post(url, json=body, headers=headers)
    assert limited.status_code == 429
    assert limited.headers["access-control-allow-origin"] == headers["Origin"]
    assert int(limited.headers["retry-after"]) >= 1
    assert "access-control-allow-origin" not in client.get(
        "/api/v1/demo", headers={"Origin": "https://invalid.example"},
    ).headers


def test_payload_limit_stream_and_content_length(client):
    url = "/api/v1/simulations/preview"
    raw = b" " * (128 * 1024 + 1)
    assert client.post(url, content=raw).status_code == 413
    assert client.post(url, content=iter([raw[:1024], raw[1024:]])).status_code == 413
