import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATA_DIR = BASE_DIR / "data"
RUNS_DIR = DATA_DIR / "runs"
ACCOUNT_FILE = DATA_DIR / "account.json"
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

DEFAULT_PROVIDER = os.getenv("HIVEWRIGHT_PROVIDER", "groq")
MAX_PARALLEL = max(1, int(os.getenv("HIVEWRIGHT_MAX_PARALLEL", "3")))
# Characters of teammate output passed into one prompt. Sized for Groq's free tier
# (8k tokens/min); raise on paid tiers for richer context.
CONTEXT_CHARS = max(4000, int(os.getenv("HIVEWRIGHT_CONTEXT_CHARS", "10000")))

RUNS_DIR.mkdir(parents=True, exist_ok=True)
