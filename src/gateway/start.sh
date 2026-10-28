#!/bin/sh
set -eu

opa run --server --addr=127.0.0.1:8181 /srv/policies &
OPA_PID=$!

cleanup() {
    kill "$OPA_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 2

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
