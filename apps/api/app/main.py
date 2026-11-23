import os

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from app.api.errors import validation_error
from app.api.limits import ComputeLimits
from app.api.v1.routes import router
from app.schemas.responses import Health
from app.services import optimizer

_DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"


async def solver_unavailable(
    _request: Request, _exc: optimizer.SolverUnavailableError,
) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": "Solver optimasi tidak tersedia. Silakan coba lagi nanti."},
    )


def create_app(*, rate_limit: int | None = None) -> FastAPI:
    application = FastAPI(
        title="RantaiTangguh API",
        description="Analisis jaringan pasok dan optimasi produksi berbasis skenario.",
        version="0.1.0",
    )
    application.add_exception_handler(RequestValidationError, validation_error)
    application.add_exception_handler(optimizer.SolverUnavailableError, solver_unavailable)
    application.include_router(router)

    if rate_limit is None:
        rate_limit = int(os.environ.get("API_RATE_LIMIT_PER_MINUTE", "60"))
    if rate_limit < 0:
        raise ValueError("API_RATE_LIMIT_PER_MINUTE harus nol atau lebih.")
    application.add_middleware(ComputeLimits, rate_limit=rate_limit)

    origins = [
        origin.strip().rstrip("/")
        for origin in os.environ.get("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",")
        if origin.strip()
    ]
    if "*" in origins:
        raise ValueError("CORS_ORIGINS harus berisi origin yang diizinkan secara eksplisit.")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @application.get("/health", response_model=Health, responses={503: {"model": Health}})
    def health(response: Response) -> Health:
        available = optimizer.solver_available()
        if not available:
            response.status_code = 503
        return Health(status="ok" if available else "unavailable", solver_available=available)

    return application


app = create_app()
