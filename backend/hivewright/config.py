import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

DEFAULT_PROVIDER = os.getenv("HIVEWRIGHT_PROVIDER", "groq")
MAX_PARALLEL = max(1, int(os.getenv("HIVEWRIGHT_MAX_PARALLEL", "3")))
# Characters of teammate output passed into one prompt. Sized for Groq's free tier
# (8k tokens/min); raise on paid tiers for richer context.
CONTEXT_CHARS = max(4000, int(os.getenv("HIVEWRIGHT_CONTEXT_CHARS", "10000")))

# Abuse guards for runs that use the server's own ("house") API key.
# Visitors who bring their own key are not limited by these.
HOUSE_RUNS_PER_IP_PER_DAY = int(os.getenv("HIVEWRIGHT_HOUSE_RUNS_PER_IP", "5"))
MAX_CONCURRENT_RUNS = int(os.getenv("HIVEWRIGHT_MAX_CONCURRENT_RUNS", "4"))
