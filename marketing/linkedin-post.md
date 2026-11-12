One AI model can answer a question.
A team of AI specialists can actually get the work done.

So I built Hivewright 🐝

You give it one request. Instead of a single model guessing in one pass:

→ An Orchestrator breaks it into subtasks and picks the right specialists
→ Specialists work in parallel and share findings on a common memory board
→ If an agent hits a gap in its expertise, it spawns a new specialist mid-run
→ A Reviewer scores every deliverable and sends weak work back for revision
→ The Orchestrator merges everything into one final answer

And you watch all of it live: the team hierarchy, every message between agents, every memory write, every token.

In the video I ask it to "plan the launch of a fintech app for freelancers in Pakistan." Six agents, about three minutes, and out comes a launch plan with market research, pricing and a 90-day marketing roadmap. (The live run is sped up 7x.)

Under the hood:
• FastAPI + asyncio runtime that runs agents in parallel, respecting dependencies between their tasks
• Event-sourced runs streamed to the browser over Server-Sent Events
• React, TypeScript, Tailwind and Motion for the dashboard
• Provider-agnostic: Groq, OpenAI, OpenRouter, or local models through Ollama
• Free and Pro tiers enforced by the backend

Hardest lesson: Groq's free tier allows 8,000 tokens per minute, and a team of agents burns through that fast. I had to budget every request (prompt plus reply) so the society stays inside the limit instead of failing on the final step.

Next up: tool use through MCP, so the agents can act inside the apps you already use.

Fun fact: I'm now officially a manager. My team works 24/7, never asks for a raise, and the only one who ever pushes back is the Reviewer. 😄

🔗 Code: https://github.com/MuhammadTalhakhan2003/hivewright
🌐 More of my work: https://muhammadtalhakhan2003.github.io/PortFolio_Talha/

I'd love your feedback, and I'm always up for a conversation with anyone building in multi-agent AI. 👇

#AI #MultiAgentSystems #LLM #FastAPI #React #BuildInPublic
