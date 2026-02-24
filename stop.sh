#!/usr/bin/env bash
# stop.sh — Encerra o servidor local do Mapa Eleitoral de Cotia

PORT="${1:-8080}"

PID_FILE="/tmp/mapa_cotia_server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill "$PID" 2>/dev/null; then
    echo "Servidor encerrado (PID: $PID)"
  else
    echo "Processo $PID não encontrado, verificando porta $PORT..."
  fi
  rm -f "$PID_FILE"
fi

# Garante que a porta está livre
REMAINING=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
if [ -n "$REMAINING" ]; then
  kill "$REMAINING" 2>/dev/null && echo "Processo na porta $PORT encerrado (PID: $REMAINING)"
fi
