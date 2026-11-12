"""HTTP API.

Stateless by design so it runs on serverless platforms (Vercel): a society
run executes *inside* the POST /api/society request and streams its events
back as Server-Sent Events. Run history lives in the visitor's browser.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import time

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import DEFAULT_PROVIDER, FRONTEND_DIST, HOUSE_RUNS_PER_IP_PER_DAY, MAX_CONCURRENT_RUNS
from .plans import FAST_MODELS, PLANS, plan_dict
from .providers import SPECS, ProviderError, make_provider
from .runtime import TERMINAL, Run, Society

app = FastAPI(title="Hivewright", version="0.2.0")
# The web app is hosted separately (Vercel); allow it plus local dev and any extra origins from env.
_extra = [o.strip() for o in os.getenv("HIVEWRIGHT_CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", *_extra],
    allow_origin_regex=r"https://hivewright[a-z0-9\-]*\.vercel\.app",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Provider-Key"],
)

# Best-effort guards (per server instance) for runs on the house key.
_ip_usage: dict[str, tuple[str, int]] = {}
_active_runs = 0


def _default_provider() -> str:
    spec = SPECS.get(DEFAULT_PROVIDER)
    return DEFAULT_PROVIDER if spec and spec.configured else "mock"


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() or (request.client.host if request.client else "unknown")


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "default_provider": _default_provider()}


@app.get("/api/providers")
async def providers() -> dict:
    return {
        "default": _default_provider(),
        "providers": [s.to_dict() for s in SPECS.values()],
        "fast_models": sorted(FAST_MODELS),
        "house_runs_per_day": HOUSE_RUNS_PER_IP_PER_DAY,
    }


@app.get("/api/providers/{name}/models")
async def provider_models(name: str) -> dict:
    spec = SPECS.get(name)
    if spec is None:
        raise HTTPException(404, "unknown provider")
    try:
        p = make_provider(name)
        try:
            models = await asyncio.wait_for(p.list_models(), 10)
        finally:
            await p.close()
        return {"models": models or list(spec.models), "live": True}
    except Exception:  # noqa: BLE001 — fall back to the static list
        return {"models": list(spec.models), "live": False}


@app.get("/api/plans")
async def get_plans() -> dict:
    return {"plans": [plan_dict(p) for p in PLANS.values()]}


class SocietyRequest(BaseModel):
    task: str = Field(min_length=3, max_length=8000)
    provider: str | None = None
    model: str | None = None
    plan_id: str = "free"


@app.post("/api/society")
async def run_society(body: SocietyRequest, request: Request,
                      x_provider_key: str | None = Header(default=None)):
    """Runs a whole society inside this request and streams its events (SSE)."""
    global _active_runs
    provider = body.provider or _default_provider()
    spec = SPECS.get(provider)
    if spec is None:
        raise HTTPException(400, f"Unknown provider '{provider}'")
    plan = PLANS.get(body.plan_id, PLANS["free"])
    model = (body.model or "").strip() or spec.model
    if plan.models == "fast" and provider != "mock" and model not in FAST_MODELS:
        if body.model:
            raise HTTPException(402, f"Model '{model}' is a Pro model. Use a fast model or upgrade to Pro.")
        model = "openai/gpt-oss-20b" if provider == "groq" else model

    own_key = (x_provider_key or "").strip() or None
    if own_key and not re.fullmatch(r"[A-Za-z0-9_\-\.]{20,200}", own_key):
        raise HTTPException(400, "That API key doesn't look valid.")
    on_house_key = provider not in ("mock", "ollama") and not own_key

    if on_house_key:
        ip, today = _client_ip(request), time.strftime("%Y-%m-%d")
        day, count = _ip_usage.get(ip, (today, 0))
        if day != today:
            count = 0
        if count >= HOUSE_RUNS_PER_IP_PER_DAY:
            raise HTTPException(429, f"You've used today's {HOUSE_RUNS_PER_IP_PER_DAY} free runs on the house key. "
                                     "Add your own free Groq key in Providers for unlimited runs.")
    if _active_runs >= MAX_CONCURRENT_RUNS:
        raise HTTPException(503, "The hive is busy right now. Please try again in a minute.")

    run = Run(body.task.strip(), provider, model, plan.id)
    try:
        society = Society(run, plan, api_key=own_key)
    except ProviderError as e:
        raise HTTPException(400, str(e))
    if on_house_key:
        _ip_usage[ip] = (today, count + 1)

    queue = run.subscribe()
    run.emit("run_created", run=run.summary())
    task = asyncio.create_task(society.execute())

    async def stream():
        global _active_runs
        _active_runs += 1
        try:
            while True:
                try:
                    ev = await asyncio.wait_for(queue.get(), 10)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"  # keeps proxies from closing an idle stream
                    continue
                yield f"id: {ev['seq']}\nevent: hivewright\ndata: {json.dumps(ev)}\n\n"
                if ev["type"] in TERMINAL:
                    return
        finally:
            _active_runs -= 1
            run.unsubscribe(queue)
            if not task.done():
                task.cancel()  # visitor left: stop spending tokens

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})


# Serve the built frontend (npm run build) from the same origin when running locally.
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        f = FRONTEND_DIST / path
        if path and f.is_file() and FRONTEND_DIST in f.resolve().parents:
            return FileResponse(f)
        return FileResponse(FRONTEND_DIST / "index.html")
