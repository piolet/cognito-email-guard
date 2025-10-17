#!/usr/bin/env bash
set -euo pipefail

# Ton authtoken ngrok en variable d'env (export NGROK_AUTHTOKEN=...)
if [[ -z "${NGROK_AUTHTOKEN:-}" ]]; then
  echo "ERR: NGROK_AUTHTOKEN manquant (export NGROK_AUTHTOKEN=...)" >&2
  exit 1
fi

PORT="${PORT:-3306}"
ENV_FILE=".env"

# 1) Init ngrok
ngrok config add-authtoken "$NGROK_AUTHTOKEN"

# 2) Lancer ngrok en arrière-plan
ngrok tcp "$PORT" > /dev/null &
NGROK_PID=$!

# 3) Attendre que l'API soit disponible
echo "Démarrage de ngrok..."
sleep 3

# 4) Récupérer le host et port depuis l'API ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"tcp://[^"]*"' | cut -d'"' -f4)

if [[ -z "$NGROK_URL" ]]; then
  echo "ERR: Impossible de récupérer l'URL ngrok" >&2
  kill $NGROK_PID 2>/dev/null || true
  exit 1
fi

# 5) Extraire host:port (supprimer uniquement tcp://)
DB_HOST=$(echo "$NGROK_URL" | sed 's|tcp://||')

echo "Tunnel ngrok actif: $NGROK_URL"
echo "DB_HOST: $DB_HOST"

# 6) Mettre à jour le .env
if [[ -f "$ENV_FILE" ]]; then
  # Backup
  cp "$ENV_FILE" "${ENV_FILE}.bak"

  # Mettre à jour ou ajouter DB_HOST
  if grep -q "^DB_HOST=" "$ENV_FILE"; then
    sed -i.tmp "s|^DB_HOST=.*|DB_HOST=$DB_HOST|" "$ENV_FILE"
  else
    echo "DB_HOST=$DB_HOST" >> "$ENV_FILE"
  fi

  # Supprimer DB_PORT si elle existe
  if grep -q "^DB_PORT=" "$ENV_FILE"; then
    sed -i.tmp "/^DB_PORT=/d" "$ENV_FILE"
  fi

  rm -f "${ENV_FILE}.tmp"
  echo "Fichier $ENV_FILE mis à jour"
else
  echo "DB_HOST=$DB_HOST" > "$ENV_FILE"
  echo "Fichier $ENV_FILE créé"
fi

# 7) Garder le tunnel actif
echo "Appuyez sur Ctrl+C pour arrêter..."
wait $NGROK_PID
