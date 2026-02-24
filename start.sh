#!/usr/bin/env bash
# start.sh — Inicia o servidor local da aplicação Mapa Eleitoral de Cotia
# Uso: ./start.sh [porta]
# Default: porta 8080

set -euo pipefail

PORT="${1:-8080}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_FILE="$ROOT_DIR/data/tse_cotia_2024.json"

# ── Cores para output ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Mapa Eleitoral de Cotia 2024 — Servidor Local${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── 1. Verifica se os dados existem ────────────────────────────────────
echo ""
echo -e "  ${CYAN}[1/3]${NC} Verificando dados..."
if [ ! -f "$DATA_FILE" ]; then
  echo -e "  ${RED}✗ Arquivo não encontrado:${NC} data/tse_cotia_2024.json"
  echo ""
  echo -e "  Execute primeiro:"
  echo -e "    ${YELLOW}cd scripts && pip install -r requirements.txt && python download_tse.py${NC}"
  echo ""
  exit 1
fi

DATA_SIZE=$(du -sh "$DATA_FILE" | cut -f1)
echo -e "  ${GREEN}✓${NC} tse_cotia_2024.json encontrado (${DATA_SIZE})"

if [ -f "$ROOT_DIR/data/cotia_votos_por_bairro.json" ]; then
  BAIRRO_SIZE=$(du -sh "$ROOT_DIR/data/cotia_votos_por_bairro.json" | cut -f1)
  echo -e "  ${GREEN}✓${NC} cotia_votos_por_bairro.json encontrado (${BAIRRO_SIZE})"
else
  echo -e "  ${YELLOW}⚠${NC}  cotia_votos_por_bairro.json não encontrado (dados por bairro indisponíveis)"
fi

# ── 2. Finaliza processo existente na porta ────────────────────────────
echo ""
echo -e "  ${CYAN}[2/3]${NC} Verificando porta $PORT..."

EXISTING_PID=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  echo -e "  ${YELLOW}⚠${NC}  Processo encontrado na porta $PORT (PID: $EXISTING_PID) — encerrando..."
  kill "$EXISTING_PID" 2>/dev/null || true
  sleep 1
  # Garante que foi encerrado
  if lsof -ti tcp:"$PORT" &>/dev/null; then
    kill -9 "$EXISTING_PID" 2>/dev/null || true
    sleep 1
  fi
  echo -e "  ${GREEN}✓${NC} Processo encerrado."
else
  echo -e "  ${GREEN}✓${NC} Porta $PORT disponível."
fi

# ── 3. Inicia servidor ─────────────────────────────────────────────────
echo ""
echo -e "  ${CYAN}[3/3]${NC} Iniciando servidor HTTP na porta $PORT..."
cd "$ROOT_DIR"
python3 -m http.server "$PORT" &>/tmp/mapa_cotia_server.log &
SERVER_PID=$!
echo "$SERVER_PID" > /tmp/mapa_cotia_server.pid

# Aguarda servidor iniciar (até 5 segundos)
for i in $(seq 1 10); do
  sleep 0.5
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null | grep -q "200"; then
    break
  fi
done

# ── Verificação de saúde ───────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Verificação de dados:"
echo ""

ERRORS=0

# index.html
HTTP_INDEX=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null)
if [ "$HTTP_INDEX" = "200" ]; then
  echo -e "  ${GREEN}✓${NC} index.html              HTTP $HTTP_INDEX"
else
  echo -e "  ${RED}✗${NC} index.html              HTTP $HTTP_INDEX"
  ERRORS=$((ERRORS + 1))
fi

# tse_cotia_2024.json
HTTP_TSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/data/tse_cotia_2024.json" 2>/dev/null)
if [ "$HTTP_TSE" = "200" ]; then
  echo -e "  ${GREEN}✓${NC} data/tse_cotia_2024.json   HTTP $HTTP_TSE"
else
  echo -e "  ${RED}✗${NC} data/tse_cotia_2024.json   HTTP $HTTP_TSE"
  ERRORS=$((ERRORS + 1))
fi

# cotia_votos_por_bairro.json
HTTP_BAIRRO=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/data/cotia_votos_por_bairro.json" 2>/dev/null)
if [ "$HTTP_BAIRRO" = "200" ]; then
  echo -e "  ${GREEN}✓${NC} data/cotia_votos_por_bairro.json HTTP $HTTP_BAIRRO"
else
  echo -e "  ${YELLOW}⚠${NC}  data/cotia_votos_por_bairro.json HTTP $HTTP_BAIRRO (opcional)"
fi

# Valida JSON (chave principal)
JSON_VALID=$(curl -s "http://localhost:$PORT/data/tse_cotia_2024.json" 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('municipio',{}).get('nome','?'))" 2>/dev/null || echo "ERRO")
if [ "$JSON_VALID" = "COTIA" ]; then
  echo -e "  ${GREEN}✓${NC} JSON válido — município: $JSON_VALID"
else
  echo -e "  ${RED}✗${NC} JSON inválido ou município inesperado: $JSON_VALID"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$ERRORS" -eq 0 ]; then
  echo -e "  ${GREEN}✓ Servidor rodando com sucesso!${NC} (PID: $SERVER_PID)"
  echo ""
  echo -e "  ${GREEN}►${NC} http://localhost:$PORT"
  echo ""
  echo -e "  Para encerrar: ${YELLOW}kill $SERVER_PID${NC}  ou  ${YELLOW}./stop.sh${NC}"
else
  echo -e "  ${RED}✗ $ERRORS erro(s) detectado(s).${NC} Veja: /tmp/mapa_cotia_server.log"
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
