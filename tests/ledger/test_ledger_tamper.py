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