from __future__ import annotations

import asyncio
import json

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import DEFAULT_PROVIDER, FRONTEND_DIST
from .plans import FAST_MODELS, PLANS, account, plan_dict
from .providers import SPECS, ProviderError, make_provider
from .runtime import TERMINAL, RunStore

app = FastAPI(title="Hivewright", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store: RunStore | None = None


@app.on_event("startup")
async def _startup() -> None:
    global store
    store = RunStore()


def _store() -> RunStore:
    assert store is not None
    return store


def _default_provider() -> str:
    spec = SPECS.get(DEFAULT_PROVIDER)
    return DEFAULT_PROVIDER if spec and spec.configured else "mock"


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "default_provider": _default_provider()}


@app.get("/api/providers")
async def providers() -> dict:
    return {"default": _default_provider(), "providers": [s.to_dict() for s in SPECS.values()],
            "fast_models": sorted(FAST_MODELS)}


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


@app.get("/api/account")
async def get_account() -> dict:
    return account.to_dict()


@app.get("/api/plans")
async def get_plans() -> dict:
    return {"plans": [plan_dict(p) for p in PLANS.values()]}


class PlanChange(BaseModel):
    plan_id: str


@app.post("/api/account/plan")
async def change_plan(body: PlanChange) -> dict:
    # Demo billing: no payment processor connected yet.
    try:
        account.set_plan(body.plan_id)
    except ValueError:
        raise HTTPException(400, "unknown plan")
    return account.to_dict()


class RunCreate(BaseModel):
    task: str = Field(min_length=3, max_length=8000)
    provider: str | None = None
    model: str | None = None


@app.post("/api/runs")
async def create_run(body: RunCreate) -> dict:
    provider = body.provider or _default_provider()
    spec = SPECS.get(provider)
    if spec is None:
        raise HTTPException(400, f"Unknown provider '{provider}'")
    model = (body.model or "").strip() or spec.model
    if account.plan.models == "fast" and provider != "mock" and not body.model and model not in FAST_MODELS:
        # Free plan without an explicit pick: quietly use the fast model.
        model = "openai/gpt-oss-20b" if provider == "groq" else model
    err = account.check_run_allowed(provider, model)
    if err:
        raise HTTPException(402, err)
    try:
        run = _store().start(body.task.strip(), provider, model, account.plan)
    except ProviderError as e:
        raise HTTPException(400, str(e))
    account.record_run()
    return run.summary()


@app.get("/api/runs")
async def list_runs() -> dict:
    return {"runs": _store().list()}


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str) -> dict:
    run = _store().runs.get(run_id)
    if run is None:
        raise HTTPException(404, "run not found")
    return {"summary": run.summary(), "result": run.result, "error": run.error, "events": run.events}


@app.delete("/api/runs/{run_id}")
async def delete_run(run_id: str) -> dict:
    run = _store().runs.get(run_id)
    if run is not None and not run.finished:
        raise HTTPException(409, "run still in progress")
    if not _store().delete(run_id):
        raise HTTPException(404, "run not found")
    return {"ok": True}


@app.get("/api/runs/{run_id}/stream")
async def stream_run(run_id: str, request: Request, after: int = 0):
    run = _store().runs.get(run_id)
    if run is None:
        raise HTTPException(404, "run not found")
    try:
        after = max(after, int(request.headers.get("last-event-id", "0")))
    except ValueError:
        pass

    def fmt(ev: dict) -> str:
        return f"id: {ev['seq']}\nevent: hivewright\ndata: {json.dumps(ev)}\n\n"

    async def gen():
        q = run.subscribe()  # subscribe before replay so nothing is missed; dedupe by seq
        last = after
        try:
            for ev in list(run.events):
                if ev["seq"] > last:
                    last = ev["seq"]
                    yield fmt(ev)
            if run.finished:
                return
            while True:
                if await request.is_disconnected():
                    return
                try:
                    ev = await asyncio.wait_for(q.get(), 15)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    continue
                if ev["seq"] <= last:
                    continue
                last = ev["seq"]
                yield fmt(ev)
                if ev["type"] in TERMINAL:
                    return
        finally:
            run.unsubscribe(q)

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# Serve the built frontend (npm run build) from the same origin in production.
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        f = FRONTEND_DIST / path
        if path and f.is_file() and FRONTEND_DIST in f.resolve().parents:
            return FileResponse(f)
        return FileResponse(FRONTEND_DIST / "index.html")
