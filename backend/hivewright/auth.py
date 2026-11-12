"""Clerk session verification.

The web app sends the visitor's Clerk session token as `Authorization: Bearer …`.
We verify it locally against Clerk's public JWKS, so the backend needs only the
*publishable* key (which encodes the Clerk Frontend API host), never the secret.

Auth is off unless HIVEWRIGHT_CLERK_PUBLISHABLE_KEY is set.
"""
from __future__ import annotations

import asyncio
import base64
import os

import jwt

PUBLISHABLE_KEY = os.getenv("HIVEWRIGHT_CLERK_PUBLISHABLE_KEY", "").strip()
# Origins allowed to have minted the token (Clerk's `azp` claim).
AUTHORIZED_PARTIES = [
    o.strip() for o in os.getenv(
        "HIVEWRIGHT_AUTHORIZED_PARTIES",
        "https://hivewright.vercel.app,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",") if o.strip()
]


def _frontend_api(pk: str) -> str | None:
    """pk_test_<base64("example.clerk.accounts.dev$")> -> "example.clerk.accounts.dev"."""
    try:
        encoded = pk.split("_", 2)[2]
        decoded = base64.b64decode(encoded + "=" * (-len(encoded) % 4)).decode()
        return decoded.rstrip("$") or None
    except (IndexError, ValueError, UnicodeDecodeError):
        return None


_FAPI = _frontend_api(PUBLISHABLE_KEY) if PUBLISHABLE_KEY else None
ENABLED = bool(_FAPI)
_jwks = jwt.PyJWKClient(f"https://{_FAPI}/.well-known/jwks.json", cache_keys=True) if ENABLED else None


class AuthError(Exception):
    pass


def _verify_sync(token: str) -> dict:
    assert _jwks is not None
    key = _jwks.get_signing_key_from_jwt(token).key
    claims = jwt.decode(token, key, algorithms=["RS256"], leeway=10, options={"require": ["exp", "iat", "sub"]})
    azp = claims.get("azp")
    if azp and AUTHORIZED_PARTIES and azp not in AUTHORIZED_PARTIES and not azp.endswith(".vercel.app"):
        raise AuthError("token was issued for another site")
    return claims


async def user_from_header(authorization: str | None) -> str | None:
    """Returns the Clerk user id, None when no token was sent; raises AuthError on a bad token."""
    if not ENABLED or not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = await asyncio.to_thread(_verify_sync, token)
    except AuthError:
        raise
    except Exception as e:  # noqa: BLE001 — any JWT/JWKS failure means "not signed in"
        raise AuthError(f"invalid session: {e.__class__.__name__}") from e
    return str(claims["sub"])
