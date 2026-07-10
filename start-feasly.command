#!/bin/zsh
# Feasly desktop launcher — double-click to boot the whole stack:
#   1. Ollama (local AI) if installed and not already running
#   2. core-service (:4001) + ai-service (:4002) + journey-app (:5173)
#   3. opens the browser at the Feasly workspace
# Keep this Terminal window open while using the app; close it (Ctrl+C) to stop.
set -e
cd "$(dirname "$0")"

echo "🚀 Starting Feasly…"

# --- Local AI (optional but recommended) ---
if command -v ollama >/dev/null 2>&1; then
  if curl -s --max-time 1 http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "🧠 Ollama already running."
  else
    echo "🧠 Starting Ollama…"
    nohup ollama serve > /tmp/feasly-ollama.log 2>&1 &
  fi
else
  echo "ℹ️  Ollama not installed — Feasly will run with the deterministic demo brain only."
  echo "   For local AI: brew install ollama && ollama pull llama3.2 && ollama pull nomic-embed-text"
fi

# --- App services ---
if [ ! -d node_modules ]; then
  echo "📦 First run — installing dependencies (one-time)…"
  npm install && npm run install:all
fi

npm run dev &
DEV_PID=$!

echo "⏳ Waiting for the app on http://localhost:5173 …"
until curl -s --max-time 1 http://localhost:5173 >/dev/null 2>&1; do sleep 1; done

echo "✅ Feasly is up — opening the workspace."
open "http://localhost:5173/ai"

wait $DEV_PID
