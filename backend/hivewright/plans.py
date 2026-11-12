"""Subscription plans.

The runtime is stateless (it runs on serverless platforms such as Vercel),
so the per-run limits below are enforced by the server for every request,
while daily usage is tracked in the visitor's browser. Billing is a demo:
upgrading flips the plan locally. Wire it to Stripe to go live.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Plan:
    id: str
    name: str
    price_monthly: int
    runs_per_day: int
    max_specialists: int
    max_dynamic_spawns: int
    review_rounds: int
    models: str  # "fast" = small/fast models only, "all" = any model
    features: tuple[str, ...]


PLANS: dict[str, Plan] = {
    "free": Plan(
        id="free",
        name="Free",
        price_monthly=0,
        runs_per_day=10,
        max_specialists=3,
        max_dynamic_spawns=1,
        review_rounds=0,
        models="fast",
        features=(
            "10 society runs per day",
            "Up to 3 specialists per run",
            "1 dynamic specialist spawn",
            "Live agent graph & message feed",
            "Fast models (GPT-OSS 20B)",
        ),
    ),
    "pro": Plan(
        id="pro",
        name="Pro",
        price_monthly=19,
        runs_per_day=200,
        max_specialists=6,
        max_dynamic_spawns=3,
        review_rounds=1,
        models="all",
        features=(
            "200 society runs per day",
            "Up to 6 specialists per run",
            "3 dynamic specialist spawns",
            "Reviewer revision loop (higher quality)",
            "All models incl. GPT-OSS 120B & Qwen 3.8 27B",
            "Markdown export of results & transcripts",
        ),
    ),
}

FAST_MODELS = {"openai/gpt-oss-20b", "llama-3.1-8b-instant", "allam-2-7b", "mock-1"}


def plan_dict(p: Plan) -> dict:
    d = asdict(p)
    d["features"] = list(p.features)
    return d
