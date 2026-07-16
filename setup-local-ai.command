#!/bin/bash
# Feasly — one-time local AI setup (double-click me).
# Installs Ollama if missing, starts it, pulls the two models Feasly uses,
# and tells you exactly what to enter in Settings. Safe to run twice.
set -e

echo "═══════════════════════════════════════════"
echo "  Feasly — local AI setup"
echo "═══════════════════════════════════════════"

if ! command -v ollama >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "→ Installing Ollama via Homebrew…"
    brew install ollama
  else
    echo "✗ Ollama isn't installed and Homebrew isn't available."
    echo "  Download it from https://ollama.com/download , install, then run me again."
    open "https://ollama.com/download" 2>/dev/null || true
    exit 1
  fi
else
  echo "✓ Ollama is installed"
fi

if ! curl -s --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "→ Starting the Ollama server…"
  (ollama serve >/dev/null 2>&1 &)
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    curl -s --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1 && break
  done
  if ! curl -s --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "✗ Ollama didn't start. Try 'brew reinstall ollama', then run me again."
    exit 1
  fi
fi
echo "✓ Ollama server is running"

for MODEL in llama3.2 nomic-embed-text; do
  if ollama list 2>/dev/null | grep -q "^$MODEL"; then
    echo "✓ Model $MODEL already pulled"
  else
    echo "→ Downloading $MODEL (one time, a few minutes)…"
    ollama pull "$MODEL"
  fi
done

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Local AI is ready."
echo ""
echo "  In Feasly: Settings → Model Hub →"
echo "    Endpoint:        http://localhost:11434"
echo "    Chat model:      llama3.2"
echo "    Embedding model: nomic-embed-text"
echo ""
echo "  Your documents never leave this machine."
echo "═══════════════════════════════════════════"
