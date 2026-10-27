"""Command-line ledger verifier:  python -m app.verify"""
import os
import sys

from .ledger import Ledger

path = os.getenv("LEDGER_PATH", "/data/ledger.jsonl")
result = Ledger(path).verify()
print(result)
sys.exit(0 if result["valid"] else 1)