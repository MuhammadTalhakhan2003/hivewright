"""Provider layer: every LLM backend speaks one small interface.

Groq, OpenAI, OpenRouter and Ollama are all OpenAI-compatible, so a single
adapter covers them. `MockProvider` simulates a society without any key.
"""
from __future__ import annotations

import asyncio
import json
import os
import random
import re
from dataclasses import dataclass

import httpx


class ProviderError(RuntimeError):
    pass


@dataclass
class ChatResult:
    content: str
    prompt_tokens: int = 0
    completion_tokens: int = 0


@dataclass(frozen=True)
class ProviderSpec:
    name: str
    label: str
    base_url: str
    key_env: str | None
    default_model: str
    models: tuple[str, ...]

    @property
    def api_key(self) -> str | None:
        return os.getenv(self.key_env) if self.key_env else None

    @property
    def configured(self) -> bool:
        if self.name in ("mock", "ollama"):
            return True
        return bool(self.api_key)

    @property
    def model(self) -> str:
        return os.getenv(f"{self.name.upper()}_MODEL") or self.default_model

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "label": self.label,
            "base_url": self.base_url,
            "key_env": self.key_env,
            "default_model": self.model,
            "models": list(self.models),
            "configured": self.configured,
        }


SPECS: dict[str, ProviderSpec] = {
    "groq": ProviderSpec(
        "groq", "Groq", "https://api.groq.com/openai/v1", "GROQ_API_KEY",
        "openai/gpt-oss-120b",
        ("openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"),
    ),
    "openai": ProviderSpec(
        "openai", "OpenAI", "https://api.openai.com/v1", "OPENAI_API_KEY",
        "gpt-4o-mini", ("gpt-4o-mini", "gpt-4o"),
    ),
    "openrouter": ProviderSpec(
        "openrouter", "OpenRouter", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY",
        "meta-llama/llama-3.3-70b-instruct", ("meta-llama/llama-3.3-70b-instruct",),
    ),
    "ollama": ProviderSpec(
        "ollama", "Ollama (local)", "http://localhost:11434/v1", None,
        "llama3.1", ("llama3.1", "qwen2.5"),
    ),
    "mock": ProviderSpec("mock", "Simulation (no key)", "", None, "mock-1", ("mock-1",)),
}


class OpenAICompatProvider:
    def __init__(self, spec: ProviderSpec, model: str) -> None:
        self.spec = spec
        self.name = spec.name
        self.model = model
        # Max tokens (prompt + reply) per request. Groq's free tier caps a minute at 8k tokens,
        # so a single request must stay below that. Raise via env on paid tiers.
        default_budget = "7600" if spec.name == "groq" else "0"
        self.request_budget = int(os.getenv(f"{spec.name.upper()}_MAX_REQUEST_TOKENS", default_budget))
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=15.0))

    async def chat(self, messages: list[dict], *, json_mode: bool = False, temperature: float = 0.4,
                   max_tokens: int = 2000, purpose: str = "work", meta: dict | None = None) -> ChatResult:
        payload: dict = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        if "gpt-oss" in self.model:
            # Reasoning models: reasoning tokens count toward max_tokens, so leave headroom.
            payload["reasoning_effort"] = os.getenv("REASONING_EFFORT", "low")
            payload["max_tokens"] = max_tokens + 4000
        payload["max_tokens"] = self._fit(messages, payload["max_tokens"])
        headers = {"Content-Type": "application/json"}
        if self.spec.api_key:
            headers["Authorization"] = f"Bearer {self.spec.api_key}"

        last_err = "unknown error"
        for attempt in range(5):
            try:
                r = await self._client.post(f"{self.spec.base_url}/chat/completions", json=payload, headers=headers)
            except httpx.HTTPError as e:
                last_err = f"network error: {e}"
                await asyncio.sleep(1.5 * (attempt + 1))
                continue
            if r.status_code == 429 or r.status_code >= 500:
                last_err = f"HTTP {r.status_code}: {r.text[:200]}"
                try:
                    wait = float(r.headers.get("retry-after", "0"))
                except ValueError:
                    wait = 0.0
                await asyncio.sleep(min(max(wait, 2.0 * (attempt + 1)), 30))
                continue
            if r.status_code == 400 and "response_format" in payload and "json" in r.text.lower():
                # Model produced invalid JSON in strict mode — retry unconstrained, we parse leniently.
                payload.pop("response_format")
                continue
            if r.status_code == 413:
                # Request (prompt + max_tokens) exceeds the per-minute token limit: shrink the reply budget.
                m = re.search(r"Limit (\d+), Requested (\d+)", r.text)
                if m:
                    over = int(m.group(2)) - int(m.group(1))
                    new_max = payload["max_tokens"] - over - 300
                    if new_max >= 500:
                        payload["max_tokens"] = new_max
                        last_err = "request too large; shrinking reply budget"
                        continue
                raise ProviderError(
                    f"{self.spec.label}: request is larger than your plan's tokens-per-minute limit. "
                    "Use fewer specialists, a shorter task, or a higher Groq tier."
                )
            if r.status_code >= 400:
                raise ProviderError(f"{self.spec.label} HTTP {r.status_code}: {r.text[:400]}")
            data = r.json()
            usage = data.get("usage") or {}
            content = (data["choices"][0]["message"].get("content") or "").strip()
            return ChatResult(content, int(usage.get("prompt_tokens", 0)), int(usage.get("completion_tokens", 0)))
        raise ProviderError(f"{self.spec.label}: retries exhausted ({last_err})")

    def _fit(self, messages: list[dict], max_tokens: int) -> int:
        """Keep prompt + max_tokens under the provider's per-request budget (Groq free tier: 8k TPM)."""
        if not self.request_budget:
            return max_tokens
        est_prompt = sum(len(m.get("content") or "") for m in messages) // 3 + 100  # conservative
        return max(600, min(max_tokens, self.request_budget - est_prompt))

    async def list_models(self) -> list[str]:
        headers = {"Authorization": f"Bearer {self.spec.api_key}"} if self.spec.api_key else {}
        r = await self._client.get(f"{self.spec.base_url}/models", headers=headers)
        r.raise_for_status()
        ids = [m["id"] for m in r.json().get("data", []) if isinstance(m, dict) and "id" in m]
        # Skip audio / guard models that can't chat.
        return sorted(i for i in ids if not re.search(r"whisper|tts|guard|distil|orpheus|playai", i))

    async def close(self) -> None:
        await self._client.aclose()


class MockProvider:
    """Deterministic-ish simulation so the product can be explored without a key."""

    name = "mock"

    def __init__(self, model: str = "mock-1") -> None:
        self.model = model
        self._spawned = False

    async def chat(self, messages: list[dict], *, json_mode: bool = False, temperature: float = 0.4,
                   max_tokens: int = 2000, purpose: str = "work", meta: dict | None = None) -> ChatResult:
        meta = meta or {}
        await asyncio.sleep(random.uniform(0.8, 2.0))
        task = meta.get("task", "the task")
        short = task if len(task) < 80 else task[:77] + "..."
        if purpose == "plan":
            body = {
                "analysis": f"The request '{short}' needs context gathering, a design, execution and a risk pass. "
                            "Research runs first; execution and risk review can run in parallel after the design.",
                "subtasks": [
                    {"id": "t1", "role": "Researcher", "title": "Gather context & prior art",
                     "instructions": "Identify key facts, constraints and existing approaches.", "depends_on": []},
                    {"id": "t2", "role": "Solutions Architect", "title": "Design the approach",
                     "instructions": "Propose a structured approach based on research.", "depends_on": ["t1"]},
                    {"id": "t3", "role": "Implementation Engineer", "title": "Produce the deliverable",
                     "instructions": "Execute the design and produce the concrete output.", "depends_on": ["t2"]},
                    {"id": "t4", "role": "Risk Analyst", "title": "Identify risks & mitigations",
                     "instructions": "List risks, edge cases and mitigations.", "depends_on": ["t2"]},
                ],
            }
            return self._r(body, json_mode)
        if purpose == "work":
            role = meta.get("role", "Specialist")
            title = meta.get("title", "subtask")
            spawn = None
            if meta.get("allow_spawn") and not self._spawned and role == "Solutions Architect":
                self._spawned = True
                spawn = {"role": "Data Specialist", "reason": "The design needs a data model I can't validate alone.",
                         "instructions": "Design the core data model and storage choices."}
            output = (
                f"### {title}\n\n"
                f"As **{role}**, here is my contribution for *{short}*.\n\n"
                f"- Key point 1 from the {role.lower()} perspective\n"
                f"- Key point 2 building on shared memory\n"
                f"- Concrete recommendation with rationale\n\n"
                f"> Simulation mode — add a GROQ_API_KEY for real reasoning."
            )
            body = {
                "output": output,
                "summary": f"{role} completed '{title}'.",
                "memory": [{"key": f"{role.lower()}-finding", "value": f"Core finding from {role} on '{title}'."}],
                "spawn": spawn,
            }
            return self._r(body, json_mode)
        if purpose == "review":
            return self._r({"verdict": "approve", "score": 8,
                            "feedback": "Deliverables are coherent and cover the request.", "revisions": []}, json_mode)
        return ChatResult(
            f"## Result\n\nThe society completed **{short}**.\n\n"
            "1. Research established the context.\n2. The architect designed the approach "
            "(with help from a dynamically spawned Data Specialist).\n3. Engineering produced the deliverable "
            "while risk analysis ran in parallel.\n\n_This is simulated output. Configure a Groq key for real results._",
            300, 180,
        )

    @staticmethod
    def _r(body: dict, json_mode: bool) -> ChatResult:
        text = json.dumps(body)
        return ChatResult(text, random.randint(400, 900), random.randint(150, 500))

    async def list_models(self) -> list[str]:
        return [self.model]

    async def close(self) -> None:
        return None


def make_provider(name: str, model: str | None = None):
    spec = SPECS.get(name)
    if spec is None:
        raise ProviderError(f"Unknown provider '{name}'")
    if name == "mock":
        return MockProvider(model or spec.model)
    if not spec.configured:
        raise ProviderError(f"{spec.label} is not configured — set {spec.key_env} in backend/.env")
    return OpenAICompatProvider(spec, model or spec.model)
