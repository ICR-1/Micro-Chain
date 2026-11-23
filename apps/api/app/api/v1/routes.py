from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter

from app.schemas.models import validate_scenario
from app.schemas.requests import CompareRequest, NetworkRequest, ScenarioRequest
from app.schemas.responses import (
    ComparisonResult,
    DemoData,
    HTTPFailure,
    NetworkAnalysis,
    SimulationResult,
    ValidationFailure,
)
from app.services import graph_analyzer, optimizer, scenario_service

router = APIRouter(prefix="/api/v1", max_body_size=128 * 1024)
_DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "demo_dapur_sari.json"
_INPUT_ERRORS = {
    413: {
        "description": "Badan permintaan melebihi 128 KiB.",
        "content": {"text/plain": {"schema": {"type": "string"}}},
    },
    422: {"model": ValidationFailure},
    429: {"model": HTTPFailure},
}
_SIMULATION_ERRORS = {**_INPUT_ERRORS, 503: {"model": HTTPFailure}}


@lru_cache(maxsize=1)
def load_demo() -> DemoData:
    demo = DemoData.model_validate_json(_DATA_FILE.read_text(encoding="utf-8"))
    for scenario in demo.scenarios:
        validate_scenario(demo.snapshot, scenario)
    return demo


@router.get("/demo", response_model=DemoData, tags=["Demo"])
def demo_data():
    return load_demo()


@router.post("/network/analyze", response_model=NetworkAnalysis, responses=_INPUT_ERRORS, tags=["Jaringan"])
def analyze_network(body: NetworkRequest):
    return graph_analyzer.analyze_network(body.snapshot, body.scenario)


@router.post("/simulations/preview", response_model=SimulationResult, responses=_SIMULATION_ERRORS, tags=["Simulasi"])
def preview_simulation(body: ScenarioRequest):
    return optimizer.solve(body.snapshot, body.scenario)


@router.post("/simulations/compare", response_model=ComparisonResult, responses=_SIMULATION_ERRORS, tags=["Simulasi"])
def compare_simulations(body: CompareRequest):
    return scenario_service.compare_scenarios(body.snapshot, body.scenarios)
