#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# Check if chinook.db exists, otherwise seed it
if [ ! -f "chinook.db" ]; then
    echo "chinook.db not found. Seeding database..."
    npm run setup:db
fi

# Detect architecture. If the virtual environment has x86_64 binaries on Apple Silicon, run via arch -x86_64
PY_SO=$(find ./venv/lib -name "_pydantic_core*.so" 2>/dev/null | head -n 1)

if [ -n "$PY_SO" ] && file "$PY_SO" | grep -q "x86_64" && ! file "$PY_SO" | grep -q "arm64"; then
    echo "Starting Python FastAPI Backend (using arch -x86_64 for Rosetta compatibility)..."
    exec arch -x86_64 ./venv/bin/python backend/main.py
else
    echo "Starting Python FastAPI Backend..."
    exec ./venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
fi
