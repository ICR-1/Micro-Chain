from math import ceil
from time import monotonic

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

_ROUTES_PREFIX = "/api/v1/"
_MAX_CLIENTS_PER_WINDOW = 4096
_LIMIT_WINDOW_SECONDS = 60


class ComputeLimits:
    def __init__(self, app: ASGIApp, *, rate_limit: int):
        self.app = app
        self.rate_limit = rate_limit
        self.requests_by_client: dict[str, int] = {}
        self.window_ends_at = 0.0

    def retry_after(self, scope: Scope) -> int | None:
        if self.rate_limit == 0:
            return None
        now = monotonic()
        if now >= self.window_ends_at:
            self.window_ends_at = now + _LIMIT_WINDOW_SECONDS
            self.requests_by_client.clear()

        client_host = (scope.get("client") or ("unknown", 0))[0]
        current = self.requests_by_client.get(client_host, 0)
        client_limit_reached = current >= self.rate_limit
        tracking_limit_reached = current == 0 and len(self.requests_by_client) >= _MAX_CLIENTS_PER_WINDOW
        if client_limit_reached or tracking_limit_reached:
            return ceil(self.window_ends_at - now)

        self.requests_by_client[client_host] = current + 1
        return None

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] != "POST" or not scope["path"].startswith(_ROUTES_PREFIX):
            await self.app(scope, receive, send)
            return

        if (retry_after := self.retry_after(scope)) is not None:
            response = JSONResponse(
                {"detail": "Batas permintaan tercapai. Coba kembali setelah beberapa saat."},
                status_code=429,
                headers={"Retry-After": str(retry_after)},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
