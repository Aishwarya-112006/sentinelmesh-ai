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