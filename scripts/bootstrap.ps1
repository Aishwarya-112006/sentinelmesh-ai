# SentinelMesh AI - project bootstrap (Windows PowerShell 5.1 or 7)
#
# Run from the PROJECT ROOT:
#   powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
#
# Creates the starter files for the walking skeleton: isolated Docker zones,
# policy gateway, OPA default-deny policy, hash-chained ledger, and tests.
# Existing files are skipped unless you pass -Force.
param([switch]$Force)
$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-File([string]$Path, [string]$Content) {
    $full = Join-Path (Get-Location).Path $Path
    if ((Test-Path $full) -and -not $Force) {
        Write-Host "skip    $Path (exists, use -Force to overwrite)" -ForegroundColor Yellow
        return
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $full -Parent) | Out-Null
    [System.IO.File]::WriteAllText($full, $Content, $utf8NoBom)
    Write-Host "create  $Path" -ForegroundColor Green
}

if (-not (Test-Path ".git")) {
    Write-Host "Run this from the project root (the folder that contains .git)." -ForegroundColor Red
    exit 1
}

Write-File 'src/gateway/app/__init__.py' ''

Write-File 'src/gateway/app/ledger.py' @'
"""Hash-chained, append-only audit ledger (skeleton).

Each entry stores the hash of the previous entry, so editing any past
entry breaks every link after it. The verifier finds the first broken link.
"""
import hashlib
import json
import os
import threading
from datetime import datetime, timezone

GENESIS = "0" * 64


def _digest(entry: dict) -> str:
    body = {k: v for k, v in entry.items() if k != "hash"}
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class Ledger:
    def __init__(self, path: str):
        self.path = path
        self._lock = threading.Lock()
        folder = os.path.dirname(path)
        if folder:
            os.makedirs(folder, exist_ok=True)
        self._last = GENESIS
        self._index = 0
        for entry in self.read_all():
            self._last = entry["hash"]
            self._index = entry["index"] + 1

    def append(self, **fields) -> dict:
        with self._lock:
            entry = {
                "index": self._index,
                "ts": datetime.now(timezone.utc).isoformat(),
                **fields,
                "prev_hash": self._last,
            }
            entry["hash"] = _digest(entry)
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
                f.flush()
                os.fsync(f.fileno())
            self._last = entry["hash"]
            self._index += 1
            return entry

    def read_all(self) -> list:
        if not os.path.exists(self.path):
            return []
        with open(self.path, "r", encoding="utf-8") as f:
            return [json.loads(line) for line in f if line.strip()]

    def verify(self) -> dict:
        expected_prev = GENESIS
        entries = self.read_all()
        for i, entry in enumerate(entries):
            ok = (
                entry.get("index") == i
                and entry.get("prev_hash") == expected_prev
                and entry.get("hash") == _digest(entry)
            )
            if not ok:
                return {"valid": False, "entries": len(entries), "first_broken_index": i}
            expected_prev = entry["hash"]
        return {"valid": True, "entries": len(entries), "first_broken_index": None}
'@

Write-File 'src/gateway/app/verify.py' @'
"""Command-line ledger verifier:  python -m app.verify"""
import os
import sys

from .ledger import Ledger

path = os.getenv("LEDGER_PATH", "/data/ledger.jsonl")
result = Ledger(path).verify()
print(result)
sys.exit(0 if result["valid"] else 1)
'@

Write-File 'src/gateway/app/main.py' @'
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
    allow_origins=["http://localhost:5173"],
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
'@

Write-File 'src/gateway/requirements.txt' @'
fastapi>=0.110
uvicorn[standard]>=0.29
httpx>=0.27
'@

Write-File 'src/gateway/Dockerfile' @'
FROM python:3.12-slim
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
RUN useradd -m -u 1000 gateway && mkdir -p /data && chown gateway /data
USER gateway
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
'@

Write-File 'src/policies/authz.rego' @'
# SentinelMesh authorisation policy: DEFAULT DENY.
# A request is allowed only if an explicit rule below matches.
package sentinelmesh.authz

import rego.v1

default allow := false

# Red Team may submit payloads to the gateway (never to the model directly).
allow if {
	input.source == "red"
	input.destination == "gateway"
	input.action == "submit_payload"
}

# Blue Team may propose defense patches to the gateway.
allow if {
	input.source == "blue"
	input.destination == "gateway"
	input.action == "propose_patch"
}
'@

Write-File 'src/policies/authz_test.rego' @'
package sentinelmesh.authz_test

import data.sentinelmesh.authz
import rego.v1

test_red_can_submit_payload_to_gateway if {
	authz.allow with input as {"source": "red", "destination": "gateway", "action": "submit_payload"}
}

test_blue_can_propose_patch if {
	authz.allow with input as {"source": "blue", "destination": "gateway", "action": "propose_patch"}
}

test_red_cannot_reach_model_directly if {
	not authz.allow with input as {"source": "red", "destination": "model", "action": "direct_access"}
}

test_red_cannot_reach_blue if {
	not authz.allow with input as {"source": "red", "destination": "blue", "action": "anything"}
}

test_blue_cannot_reach_model if {
	not authz.allow with input as {"source": "blue", "destination": "model", "action": "direct_access"}
}

test_unknown_action_is_denied if {
	not authz.allow with input as {"source": "red", "destination": "gateway", "action": "delete_everything"}
}
'@

Write-File 'src/ingress/nginx.conf' @'
# Ingress proxy: the only container with a published port.
# The gateway itself has no external network, so it has no route to the internet.
server {
    listen 80;
    resolver 127.0.0.11 valid=10s;
    set $upstream http://gateway:8000;

    location / {
        proxy_pass $upstream;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
'@

Write-File 'docker-compose.yml' @'
name: sentinelmesh

# Hardening shared by the four placeholder zones.
x-zone: &zone
  image: python:3.12-slim
  command: ["python", "-m", "http.server", "8000"]
  read_only: true
  tmpfs: ["/tmp"]
  cap_drop: ["ALL"]
  security_opt: ["no-new-privileges:true"]
  mem_limit: 256m
  pids_limit: 100
  user: "1000:1000"
  working_dir: /tmp

services:
  ingress:
    image: nginx:1.27-alpine
    ports:
      - "8000:80"
    volumes:
      - ./src/ingress/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks: [edge, ctrl_net]
    depends_on: [gateway]

  gateway:
    build: ./src/gateway
    environment:
      OPA_URL: http://opa:8181/v1/data/sentinelmesh/authz/allow
      LEDGER_PATH: /data/ledger.jsonl
      RED_KEY: ${RED_KEY:-dev-red-key}
      BLUE_KEY: ${BLUE_KEY:-dev-blue-key}
    volumes:
      - ledger_data:/data
    networks: [ctrl_net, red_net, blue_net, model_net, eval_net]
    depends_on: [opa]

  opa:
    image: openpolicyagent/opa:latest
    command: ["run", "--server", "--addr=0.0.0.0:8181", "/policies"]
    volumes:
      - ./src/policies:/policies:ro
    networks: [ctrl_net]

  red:
    <<: *zone
    networks: [red_net]

  blue:
    <<: *zone
    networks: [blue_net]

  model:
    <<: *zone
    networks: [model_net]

  eval:
    <<: *zone
    networks: [eval_net]

# "internal: true" means no route to the host network or the internet.
networks:
  edge: {}
  ctrl_net: { internal: true }
  red_net: { internal: true }
  blue_net: { internal: true }
  model_net: { internal: true }
  eval_net: { internal: true }

volumes:
  ledger_data: {}
'@

Write-File 'tests/boundary/test_boundaries.py' @'
"""Boundary tests: every forbidden route must be blocked (needs the stack running)."""
import httpx
import pytest

BASE = "http://localhost:8000"
RED = {"X-Zone-Key": "dev-red-key"}
BLUE = {"X-Zone-Key": "dev-blue-key"}


def send(headers, destination, action):
    return httpx.post(
        f"{BASE}/v1/request",
        headers=headers,
        json={"destination": destination, "action": action, "payload": {}},
        timeout=5,
    )


def test_red_cannot_reach_model_directly():
    assert send(RED, "model", "direct_access").status_code == 403


def test_red_cannot_reach_blue():
    assert send(RED, "blue", "anything").status_code == 403


def test_blue_cannot_reach_model_directly():
    assert send(BLUE, "model", "direct_access").status_code == 403


def test_unknown_action_is_denied_by_default():
    assert send(RED, "gateway", "delete_everything").status_code == 403


def test_unauthenticated_request_is_rejected():
    assert send({}, "gateway", "submit_payload").status_code == 401


def test_red_can_submit_payload_through_gateway():
    r = send(RED, "gateway", "submit_payload")
    assert r.status_code == 200 and r.json()["decision"] == "allow"


def test_ledger_chain_is_valid_after_all_requests():
    r = httpx.get(f"{BASE}/v1/ledger/verify", timeout=5)
    assert r.json()["valid"] is True
'@

Write-File 'tests/ledger/test_ledger_tamper.py' @'
"""Tamper test: editing a past ledger entry must be detected (no Docker needed)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src" / "gateway"))
from app.ledger import Ledger  # noqa: E402


def make_ledger(tmp_path):
    ledger = Ledger(str(tmp_path / "ledger.jsonl"))
    for i in range(4):
        ledger.append(source="red", destination="model", action=f"a{i}", decision="deny")
    return ledger


def test_clean_chain_verifies(tmp_path):
    assert make_ledger(tmp_path).verify()["valid"] is True


def test_edited_entry_is_detected(tmp_path):
    ledger = make_ledger(tmp_path)
    lines = Path(ledger.path).read_text().splitlines()
    entry = json.loads(lines[1])
    entry["decision"] = "allow"  # attacker rewrites history
    lines[1] = json.dumps(entry)
    Path(ledger.path).write_text("\n".join(lines) + "\n")
    result = Ledger(ledger.path).verify()
    assert result["valid"] is False
    assert result["first_broken_index"] == 1


def test_deleted_middle_entry_is_detected(tmp_path):
    ledger = make_ledger(tmp_path)
    lines = Path(ledger.path).read_text().splitlines()
    del lines[1]
    Path(ledger.path).write_text("\n".join(lines) + "\n")
    assert Ledger(ledger.path).verify()["valid"] is False
'@

Write-File 'requirements-dev.txt' @'
pytest>=8
httpx>=0.27
'@

Write-File '.env.example' @'
# Copy to .env and change. DEV keys only: replaced by JWT/mTLS later.
RED_KEY=dev-red-key
BLUE_KEY=dev-blue-key
'@

Write-File '.vscode/extensions.json' @'
{
  "recommendations": [
    "ms-azuretools.vscode-docker",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "tsandall.opa",
    "redhat.vscode-yaml",
    "bierner.markdown-mermaid",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss"
  ]
}
'@


# Extend .gitignore without duplicating lines
$wanted = @(".venv/", "__pycache__/", ".pytest_cache/", "node_modules/", ".env", "Thumbs.db", "*.log")
$existing = @()
if (Test-Path ".gitignore") { $existing = Get-Content ".gitignore" }
$missing = $wanted | Where-Object { $existing -notcontains $_ }
if ($missing) {
    Add-Content -Path ".gitignore" -Value $missing -Encoding ASCII
    Write-Host "update  .gitignore (+$($missing.Count) lines)" -ForegroundColor Green
}

New-Item -ItemType Directory -Force -Path "docs", "demo", "eval" | Out-Null

Write-Host ""
Write-Host "Done. Next: follow setup.md from 'Step 4' (Python environment)." -ForegroundColor Cyan
