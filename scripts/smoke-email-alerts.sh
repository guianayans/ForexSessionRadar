#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Rodando testes de mercado"
npm --workspace backend run test:market

echo "==> Rodando testes de cobertura de alarmes x e-mail"
npm --workspace backend run test:email-alerts

if [[ "${SEND_REAL_EMAIL:-0}" == "1" ]]; then
  echo "==> Disparando teste real de e-mail via API (127.0.0.1:4783)"
  curl -sS -X POST "http://127.0.0.1:4783/api/email-config/test" \
    -H "Content-Type: application/json" \
    -d '{}' | jq .
else
  echo "==> Teste real de envio pulado (defina SEND_REAL_EMAIL=1 para habilitar)"
fi

echo "==> Smoke test finalizado com sucesso"

