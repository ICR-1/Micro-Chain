FROM ghcr.io/astral-sh/uv:0.13.7 AS uv_bin
FROM python:3.12-slim

COPY --from=uv_bin /uv /usr/local/bin/uv
WORKDIR /srv/pasok-siaga
ENV UV_NO_CACHE=1 UV_COMPILE_BYTECODE=1

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev
COPY app ./app

ENV PORT=8000 PATH="/srv/pasok-siaga/.venv/bin:$PATH"
EXPOSE 8000
USER 10001
HEALTHCHECK --interval=30s --timeout=4s --retries=3 --start-period=10s CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ['PORT'] + '/health', timeout=3).close()"
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"$PORT\""]
