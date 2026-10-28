"""SentinelMesh Policy Gateway: walking skeleton.

What it does today:
  1. identifies the calling zone from its API key (DEV PLACEHOLDER)
  2. asks the policy engine (OPA) whether the request is allowed
  3. writes the decision to the hash-chained ledger BEFORE answering
  4. fails closed if the policy engine or the ledger is unavailable

What it does NOT do yet: forwarding to zones, payload inspection, JWT/mTLS.
"""
import hashlib
import json
import os

import httpx
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .ledger import Ledger

OPA_URL = os.getenv("OPA_URL", "http://opa:8181/v1/data/sentinelmesh/authz/allow")

# DEV ONLY: static keys stand in for real zone identity (JWT / mTLS later).
ZONE_KEYS = {
    os.getenv("RED_KEY", "dev-red-key"): "red",
    os.getenv("BLUE_KEY", "dev-blue-key"): "blue",
}

ledger = Ledger(os.getenv("LEDGER_PATH", "/data/ledger.jsonl"))

app = FastAPI(title="SentinelMesh Policy Gateway (skeleton)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://sentinelmesh-ai.vercel.app",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


class ZoneRequest(BaseModel):
    destination: str
    action: str
    payload: dict = {}


def _payload_hash(payload: dict) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def _log(source: str, req: ZoneRequest, decision: str, reason: str) -> dict:
    try:
        return ledger.append(
            source=source,
            destination=req.destination,
            action=req.action,
            decision=decision,
            reason=reason,
            payload_hash=_payload_hash(req.payload),
        )
    except Exception:
        raise HTTPException(status_code=503, detail="ledger unavailable, failing closed")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/request")
async def handle_request(req: ZoneRequest, x_zone_key: str | None = Header(default=None)):
    source = ZONE_KEYS.get(x_zone_key or "")
    if source is None:
        _log("unknown", req, "deny", "unauthenticated")
        raise HTTPException(status_code=401, detail="unauthenticated")

    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.post(
                OPA_URL,
                json={"input": {"source": source, "destination": req.destination, "action": req.action}},
            )
            resp.raise_for_status()
            allowed = resp.json().get("result", False) is True
    except Exception:
        _log(source, req, "deny", "policy_engine_unavailable")
        raise HTTPException(status_code=503, detail="policy engine unavailable, failing closed")

    if not allowed:
        entry = _log(source, req, "deny", "no_matching_allow_rule")
        return JSONResponse(status_code=403, content={"decision": "deny", "entry_hash": entry["hash"]})

    entry = _log(source, req, "allow", "policy_allow")
    return {
        "decision": "allow",
        "entry_hash": entry["hash"],
        "forwarded": False,
        "note": "skeleton: forwarding to zones is not implemented yet",
    }


@app.get("/v1/ledger")
def read_ledger(limit: int = 50):
    return ledger.read_all()[-limit:]


@app.get("/v1/ledger/verify")
def verify_ledger():
    return ledger.verify()