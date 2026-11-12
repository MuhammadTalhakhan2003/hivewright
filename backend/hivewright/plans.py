"""Subscription plans and a single local account with daily usage metering.

Billing is not wired to a payment processor yet: `upgrade` flips the plan
locally so the paid experience can be demoed end to end. Swap `set_plan`
for a Stripe webhook handler when going live.
"""
from __future__ import annotations

import json
import threading
import time
from dataclasses import asdict, dataclass

from .config import ACCOUNT_FILE


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


class Account:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.plan_id = "free"
        self.usage_day = self._today()
        self.runs_today = 0
        self.total_runs = 0
        self.total_tokens = 0
        self._load()

    @staticmethod
    def _today() -> str:
        return time.strftime("%Y-%m-%d")

    def _load(self) -> None:
        if ACCOUNT_FILE.exists():
            try:
                d = json.loads(ACCOUNT_FILE.read_text("utf-8"))
                self.plan_id = d.get("plan_id", "free") if d.get("plan_id") in PLANS else "free"
                self.usage_day = d.get("usage_day", self._today())
                self.runs_today = int(d.get("runs_today", 0))
                self.total_runs = int(d.get("total_runs", 0))
                self.total_tokens = int(d.get("total_tokens", 0))
            except (ValueError, OSError):
                pass

    def _save(self) -> None:
        ACCOUNT_FILE.parent.mkdir(parents=True, exist_ok=True)
        ACCOUNT_FILE.write_text(
            json.dumps(
                {
                    "plan_id": self.plan_id,
                    "usage_day": self.usage_day,
                    "runs_today": self.runs_today,
                    "total_runs": self.total_runs,
                    "total_tokens": self.total_tokens,
                }
            ),
            "utf-8",
        )

    def _roll_day(self) -> None:
        today = self._today()
        if self.usage_day != today:
            self.usage_day = today
            self.runs_today = 0

    @property
    def plan(self) -> Plan:
        return PLANS[self.plan_id]

    def check_run_allowed(self, provider: str, model: str) -> str | None:
        """Return an error message if the run is not allowed, else None."""
        with self._lock:
            self._roll_day()
            p = self.plan
            if self.runs_today >= p.runs_per_day:
                return f"Daily limit reached ({p.runs_per_day} runs on the {p.name} plan). Upgrade to Pro for more."
            if p.models == "fast" and provider != "mock" and model not in FAST_MODELS:
                return f"Model '{model}' is a Pro model. Use a fast model or upgrade to Pro."
            return None

    def record_run(self) -> None:
        with self._lock:
            self._roll_day()
            self.runs_today += 1
            self.total_runs += 1
            self._save()

    def record_tokens(self, n: int) -> None:
        with self._lock:
            self.total_tokens += n
            self._save()

    def set_plan(self, plan_id: str) -> None:
        if plan_id not in PLANS:
            raise ValueError("unknown plan")
        with self._lock:
            self.plan_id = plan_id
            self._save()

    def to_dict(self) -> dict:
        with self._lock:
            self._roll_day()
            return {
                "plan": plan_dict(self.plan),
                "usage": {
                    "runs_today": self.runs_today,
                    "runs_per_day": self.plan.runs_per_day,
                    "total_runs": self.total_runs,
                    "total_tokens": self.total_tokens,
                },
            }


def plan_dict(p: Plan) -> dict:
    d = asdict(p)
    d["features"] = list(p.features)
    return d


account = Account()
