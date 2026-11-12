"""The agent society.

Flow:  Orchestrator plans -> specialists execute in dependency waves (in
parallel where possible, sharing a memory board, optionally spawning new
specialists) -> Reviewer critiques -> flagged specialists revise ->
Orchestrator synthesizes the final answer.

Every state change is emitted as an event; the UI rebuilds the whole run
by replaying events, so a live view and a historical view are identical.
"""
from __future__ import annotations

import asyncio
import json
import re
import time
import uuid
from dataclasses import asdict, dataclass, field

from .config import CONTEXT_CHARS, MAX_PARALLEL
from .plans import Plan
from .providers import ChatResult, make_provider

TERMINAL = {"run_completed", "run_failed"}


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _clip(text: str, n: int) -> str:
    text = text or ""
    return text if len(text) <= n else text[: n - 20] + "\n…[truncated]"


def parse_json(text: str) -> dict:
    """Lenient JSON extraction: models sometimes wrap JSON in prose or fences."""
    text = (text or "").strip()
    try:
        v = json.loads(text)
        return v if isinstance(v, dict) else {}
    except ValueError:
        pass
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S)
    if fence:
        try:
            return json.loads(fence.group(1))
        except ValueError:
            pass
    start, end = text.find("{"), text.rfind("}")
    if 0 <= start < end:
        try:
            return json.loads(text[start : end + 1])
        except ValueError:
            pass
    return {}


@dataclass
class Agent:
    id: str
    name: str
    role: str
    kind: str  # orchestrator | specialist | spawned | reviewer
    parent_id: str | None
    status: str = "idle"  # idle | thinking | done | failed
    task: str = ""
    output: str = ""
    summary: str = ""
    tokens: int = 0
    created_at: float = field(default_factory=time.time)


class Run:
    def __init__(self, task: str, provider: str, model: str, plan_id: str, run_id: str | None = None) -> None:
        self.id = run_id or _id("run")
        self.task = task
        self.provider = provider
        self.model = model
        self.plan_id = plan_id
        self.status = "queued"
        self.created_at = time.time()
        self.finished_at: float | None = None
        self.agents: dict[str, Agent] = {}
        self.result = ""
        self.error = ""
        self.tokens = 0
        self.events: list[dict] = []
        self._subs: set[asyncio.Queue] = set()

    # --- events -----------------------------------------------------------
    def emit(self, type_: str, **data) -> dict:
        ev = {"seq": len(self.events) + 1, "ts": time.time(), "type": type_, **data}
        self.events.append(ev)
        for q in list(self._subs):
            q.put_nowait(ev)
        return ev

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subs.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subs.discard(q)

    @property
    def finished(self) -> bool:
        return self.status in ("completed", "failed")

    def set_status(self, status: str) -> None:
        self.status = status
        self.emit("run_status", status=status)

    def summary(self) -> dict:
        return {
            "id": self.id,
            "task": self.task,
            "status": self.status,
            "provider": self.provider,
            "model": self.model,
            "plan_id": self.plan_id,
            "created_at": self.created_at,
            "finished_at": self.finished_at,
            "agent_count": len(self.agents),
            "tokens": self.tokens,
        }

class Society:
    def __init__(self, run: Run, plan: Plan, api_key: str | None = None) -> None:
        self.run = run
        self.plan = plan
        self.provider = make_provider(run.provider, run.model, api_key=api_key)
        self.sem = asyncio.Semaphore(MAX_PARALLEL)
        self.memory: list[dict] = []
        self.deliverables: dict[str, dict] = {}  # subtask id -> {agent_id, title, output}
        self.extras: list[dict] = []  # outputs from dynamically spawned agents
        self.spawns = 0

    # --- helpers ------------------------------------------------------------
    def spawn(self, name: str, role: str, kind: str, parent: Agent | None, task: str = "") -> Agent:
        a = Agent(_id("agt"), name, role, kind, parent.id if parent else None, task=task)
        self.run.agents[a.id] = a
        self.run.emit("agent_spawned", agent=asdict(a))
        return a

    def update(self, a: Agent, **changes) -> None:
        for k, v in changes.items():
            setattr(a, k, v)
        self.run.emit("agent_updated", agent=asdict(a))

    def say(self, frm: str, to: str, kind: str, content: str) -> None:
        self.run.emit("message", message={"id": _id("msg"), "from": frm, "to": to, "kind": kind,
                                          "content": content, "ts": time.time()})

    def remember(self, author: Agent, key: str, value: str) -> None:
        entry = {"id": _id("mem"), "key": str(key)[:60], "value": str(value)[:600], "author": author.id,
                 "ts": time.time()}
        self.memory.append(entry)
        self.run.emit("memory_write", entry=entry)

    def memory_text(self) -> str:
        if not self.memory:
            return "(empty)"
        names = {a.id: a.name for a in self.run.agents.values()}
        return "\n".join(f"- [{names.get(m['author'], '?')}] {m['key']}: {m['value']}" for m in self.memory[-12:])

    async def think(self, agent: Agent, system: str, user: str, *, json_mode: bool, purpose: str,
                    meta: dict | None = None, max_tokens: int = 2000) -> ChatResult:
        self.update(agent, status="thinking")
        async with self.sem:
            res = await self.provider.chat(
                [{"role": "system", "content": system}, {"role": "user", "content": user}],
                json_mode=json_mode, purpose=purpose, max_tokens=max_tokens,
                meta={"task": self.run.task, **(meta or {})},
            )
        used = res.prompt_tokens + res.completion_tokens
        self.run.tokens += used
        agent.tokens += used
        self.run.emit("usage", tokens=self.run.tokens)
        return res

    def persona(self, a: Agent) -> str:
        return (f"You are {a.name}, a {a.role} inside Hivewright, a society of specialist AI agents "
                "collaborating on a user's request. Contribute only within your expertise, build on "
                "teammates' work in shared memory, and be concrete, accurate and substantive.")

    # --- phases -------------------------------------------------------------
    async def execute(self) -> None:
        run = self.run
        try:
            run.set_status("planning")
            orch = self.spawn("Orchestrator", "Orchestrator", "orchestrator", None, task=run.task)
            self.say("user", orch.id, "task", run.task)
            subtasks = await self.make_plan(orch)

            run.set_status("executing")
            agents_by_task: dict[str, Agent] = {}
            for st in subtasks:
                a = self.spawn(st["role"], st["role"], "specialist", orch, task=st["instructions"])
                agents_by_task[st["id"]] = a
                self.say(orch.id, a.id, "assign", f"**{st['title']}** — {st['instructions']}")

            done: set[str] = set()
            pending = list(subtasks)
            while pending:
                ready = [s for s in pending if all(d in done for d in s["depends_on"])]
                if not ready:  # defensive: break cycles
                    ready = pending[:1]
                await asyncio.gather(*(self.work(agents_by_task[s["id"]], s, orch) for s in ready))
                for s in ready:
                    done.add(s["id"])
                    pending.remove(s)

            for rnd in range(self.plan.review_rounds + 1):
                run.set_status("reviewing")
                revisions = await self.review(orch, final=rnd == self.plan.review_rounds)
                if not revisions:
                    break
                run.set_status("revising")
                by_id = {s["id"]: s for s in subtasks}
                await asyncio.gather(*(
                    self.work(agents_by_task[r["id"]], by_id[r["id"]], orch, feedback=r["feedback"])
                    for r in revisions
                ))

            run.set_status("synthesizing")
            await self.synthesize(orch)
            self.update(orch, status="done")
            run.result = orch.output
            run.finished_at = time.time()
            run.status = "completed"
            run.emit("run_completed", result=run.result, tokens=run.tokens)
        except Exception as e:  # noqa: BLE001 — surface any failure to the UI
            run.error = str(e) or e.__class__.__name__
            run.finished_at = time.time()
            run.status = "failed"
            for a in run.agents.values():
                if a.status == "thinking":
                    self.update(a, status="failed")
            run.emit("run_failed", error=run.error)
        finally:
            await self.provider.close()

    async def make_plan(self, orch: Agent) -> list[dict]:
        n = self.plan.max_specialists
        system = self.persona(orch) + (
            "\n\nYou lead the society. Decompose the user's request into subtasks for specialist agents.\n"
            "Respond with JSON only, shaped exactly like:\n"
            '{"analysis": "2-3 sentences on how you will tackle it", "subtasks": [{"id": "t1", "role": '
            '"specialist role", "title": "short title", "instructions": "specific, actionable instructions", '
            '"depends_on": []}]}\n'
            f"Rules: 1 to {n} subtasks (simple requests need fewer); ids t1..t{n} in order; depends_on may only "
            "reference earlier ids; keep independent work parallel; choose precise roles such as Researcher, "
            "Solutions Architect, Backend Engineer, Frontend Engineer, Security Analyst, Data Analyst, "
            "Technical Writer, DevOps Engineer, Product Strategist, Financial Analyst, Marketing Strategist, "
            "Legal Analyst; each role should appear once."
        )
        res = await self.think(orch, system, f"User request:\n{self.run.task}", json_mode=True, purpose="plan")
        data = parse_json(res.content)
        raw = data.get("subtasks") if isinstance(data.get("subtasks"), list) else []

        subtasks: list[dict] = []
        seen: set[str] = set()
        for i, s in enumerate(raw[:n]):
            if not isinstance(s, dict):
                continue
            sid = str(s.get("id") or f"t{i + 1}")
            if sid in seen:
                sid = f"t{i + 1}_{i}"
            deps = [str(d) for d in (s.get("depends_on") or []) if str(d) in seen]
            seen.add(sid)
            subtasks.append({
                "id": sid,
                "role": str(s.get("role") or "Specialist")[:40],
                "title": str(s.get("title") or f"Subtask {i + 1}")[:80],
                "instructions": str(s.get("instructions") or s.get("title") or self.run.task)[:1500],
                "depends_on": deps,
            })
        if not subtasks:
            subtasks = [{"id": "t1", "role": "Generalist", "title": "Complete the request",
                         "instructions": self.run.task, "depends_on": []}]

        analysis = str(data.get("analysis") or "Plan ready.")
        plan_md = analysis + "\n\n" + "\n".join(
            f"{i + 1}. **{s['role']}** — {s['title']}" + (f" _(after {', '.join(s['depends_on'])})_" if s["depends_on"] else "")
            for i, s in enumerate(subtasks)
        )
        self.update(orch, summary=analysis)
        self.say(orch.id, "all", "plan", plan_md)
        self.remember(orch, "plan", analysis)
        self.run.emit("plan", subtasks=subtasks)
        return subtasks

    async def work(self, agent: Agent, st: dict, orch: Agent, feedback: str = "",
                   allow_spawn: bool = True) -> None:
        deps = [d for d in st["depends_on"] if d in self.deliverables]
        per_dep = max(1200, int(CONTEXT_CHARS * 0.6) // max(1, len(deps)))
        dep_text = "\n\n".join(
            f"### From {self.deliverables[d]['role']} ({self.deliverables[d]['title']})\n"
            f"{_clip(self.deliverables[d]['output'], per_dep)}"
            for d in deps
        ) or "(none)"
        can_spawn = allow_spawn and not feedback and self.spawns < self.plan.max_dynamic_spawns
        spawn_rule = (
            '"spawn": null, or {"role": "...", "reason": "...", "instructions": "..."} ONLY if your subtask '
            "truly needs expertise outside your role (rare)"
            if can_spawn else '"spawn": null'
        )
        system = self.persona(agent) + (
            "\n\nRespond with JSON only, shaped like:\n"
            '{"output": "your complete deliverable in Markdown", "summary": "one sentence", '
            '"memory": [{"key": "short label", "value": "a fact or decision teammates should know"}], '
            + spawn_rule + "}\n"
            "Put real substance in output (specifics, examples, code or numbers where relevant). "
            "Share 0-3 memory items."
        )
        user = (
            f"Overall user request:\n{self.run.task}\n\n"
            f"Your subtask: {st['title']}\nInstructions: {st['instructions']}\n\n"
            f"Shared memory board:\n{self.memory_text()}\n\n"
            f"Work delivered by teammates you depend on:\n{dep_text}"
        )
        if feedback:
            prev = self.deliverables.get(st["id"], {}).get("output", "")
            user += f"\n\nThe Reviewer asked for a revision:\n{feedback}\n\nYour previous output:\n{_clip(prev, int(CONTEXT_CHARS * 0.4))}"

        res = await self.think(agent, system, user, json_mode=True, purpose="work",
                               meta={"role": agent.role, "title": st["title"], "allow_spawn": can_spawn},
                               max_tokens=2500)
        data = parse_json(res.content)
        output = str(data.get("output") or res.content or "").strip()
        summary = str(data.get("summary") or f"Delivered '{st['title']}'.")
        self.deliverables[st["id"]] = {"agent_id": agent.id, "role": agent.role, "title": st["title"],
                                       "output": output}
        for m in (data.get("memory") or [])[:3]:
            if isinstance(m, dict) and m.get("value"):
                self.remember(agent, m.get("key", "note"), m["value"])

        spawn = data.get("spawn")
        if can_spawn and isinstance(spawn, dict) and spawn.get("role"):
            self.spawns += 1
            await self.delegate(agent, spawn, st)

        self.update(agent, status="done", output=output, summary=summary)
        self.say(agent.id, orch.id, "revision" if feedback else "deliver", summary)

    async def delegate(self, parent: Agent, spawn: dict, st: dict) -> None:
        role = str(spawn["role"])[:40]
        instr = str(spawn.get("instructions") or st["instructions"])[:1500]
        child = self.spawn(role, role, "spawned", parent, task=instr)
        self.run.emit("log", level="info",
                      text=f"{parent.name} spawned {role}: {spawn.get('reason', 'missing expertise')}")
        self.say(parent.id, child.id, "delegate", f"{spawn.get('reason', '')}\n\n{instr}".strip())
        sub = {"id": f"{st['id']}_sub{self.spawns}", "title": f"Support for {st['title']}",
               "instructions": instr, "depends_on": [st["id"]] if st["id"] in self.deliverables else []}
        await self.work(child, sub, parent, allow_spawn=False)
        self.extras.append(self.deliverables[sub["id"]])

    async def review(self, orch: Agent, final: bool) -> list[dict]:
        reviewer = next((a for a in self.run.agents.values() if a.kind == "reviewer"), None)
        if reviewer is None:
            reviewer = self.spawn("Reviewer", "Quality Reviewer", "reviewer", orch,
                                  task="Review all deliverables against the request.")
        per = max(700, int(CONTEXT_CHARS * 0.9) // max(1, len(self.deliverables)))
        body = "\n\n".join(f"### [{sid}] {d['role']} — {d['title']}\n{_clip(d['output'], per)}"
                           for sid, d in self.deliverables.items())
        ids = [sid for sid in self.deliverables if "_sub" not in sid]
        system = self.persona(reviewer) + (
            "\n\nYou are the quality gate. Check the deliverables for correctness, completeness, "
            "consistency with each other, and fit to the user's request.\nRespond with JSON only:\n"
            '{"verdict": "approve" or "revise", "score": 1-10, "feedback": "2-4 sentences", '
            '"revisions": [{"id": "subtask id", "feedback": "exactly what to fix"}]}\n'
            + ("Only request revisions for serious gaps, at most 2. " if not final else
               "This is the final review: verdict must be approve and revisions empty. ")
            + f"Valid subtask ids: {', '.join(ids)}."
        )
        res = await self.think(reviewer, system, f"User request:\n{self.run.task}\n\nDeliverables:\n{body}",
                               json_mode=True, purpose="review")
        data = parse_json(res.content)
        feedback = str(data.get("feedback") or "Reviewed.")
        score = data.get("score")
        revisions = [] if final else [
            {"id": str(r["id"]), "feedback": str(r.get("feedback", ""))[:1000]}
            for r in (data.get("revisions") or [])
            if isinstance(r, dict) and str(r.get("id")) in ids
        ][:2]
        verdict = "revise" if revisions else "approve"
        self.update(reviewer, status="done", summary=f"{verdict} ({score}/10)" if score else verdict,
                    output=feedback)
        self.say(reviewer.id, orch.id, "review", f"**Verdict: {verdict}**" + (f" · score {score}/10" if score else "")
                 + f"\n\n{feedback}")
        for r in revisions:
            target = self.deliverables[r["id"]]["agent_id"]
            self.say(reviewer.id, target, "feedback", r["feedback"])
        return revisions

    async def synthesize(self, orch: Agent) -> None:
        per = max(900, CONTEXT_CHARS // max(1, len(self.deliverables)))
        body = "\n\n".join(f"### {d['role']} — {d['title']}\n{_clip(d['output'], per)}"
                           for d in [*self.deliverables.values()])
        system = self.persona(orch) + (
            "\n\nWrite the final answer for the user by merging the team's deliverables into one coherent, "
            "well-structured Markdown response. Resolve contradictions, remove repetition, keep all concrete "
            "specifics (code, numbers, steps). Do not describe the internal team process. Start directly with "
            "the content, using headings."
        )
        res = await self.think(orch, system, f"User request:\n{self.run.task}\n\nTeam deliverables:\n{body}",
                               json_mode=False, purpose="synthesize", max_tokens=4000)
        self.update(orch, output=res.content.strip())
        self.say(orch.id, "user", "result", "Final answer ready.")
