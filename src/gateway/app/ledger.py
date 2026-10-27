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