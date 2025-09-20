#!/usr/bin/env bash
# email-formatter-call.sh
## To call :  ./script.sh --key test --payload '{"emailId":"registration-customer", "content":{"to":"lbuisson26@gmail.com"} }'
set -euo pipefail

# --- Options (ENV ou flags) ---
STAGE="${STAGE:-dev}"                       # dev|staging|prod|...
EMAIL_FORMATTER_KEY="${EMAIL_FORMATTER_KEY:-}"  # obligatoire
EMAIL_FORMATTER_PAYLOAD="${EMAIL_FORMATTER_PAYLOAD:-}"  # JSON inline (alternatif à --payload-file)
OUT_FILE="${OUT_FILE:-response.json}"       # chemin de sortie du JSON
ENV_FILE="${ENV_FILE:-email.env}"           # dotenv export minimal

PAYLOAD_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stage) STAGE="$2"; shift 2 ;;
    --key) EMAIL_FORMATTER_KEY="$2"; shift 2 ;;
    --payload) EMAIL_FORMATTER_PAYLOAD="$2"; shift 2 ;;
    --payload-file) PAYLOAD_FILE="$2"; shift 2 ;;
    --out) OUT_FILE="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    -h|--help)
      cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --stage <name>            Stage (par défaut: \$STAGE ou "dev"; si "prod" => domaine sans sous-domaine)
  --key <token>             Bearer token pour Authorization (ou via \$EMAIL_FORMATTER_KEY)
  --payload '<json>'        Payload JSON inline (ou via \$EMAIL_FORMATTER_PAYLOAD)
  --payload-file <path>     Fichier contenant le JSON du payload (prioritaire sur --payload)
  --out <file>              Fichier de sortie pour la réponse JSON (par défaut: response.json)
  --env-file <file>         Fichier dotenv exportant quelques champs utiles (par défaut: email.env)
  -h, --help                Afficher l'aide

Variables ENV équivalentes : STAGE, EMAIL_FORMATTER_KEY, EMAIL_FORMATTER_PAYLOAD, OUT_FILE, ENV_FILE
EOF
      exit 0
      ;;
    *)
      echo "Option inconnue: $1" >&2; exit 2 ;;
  esac
done

# --- Dépendances ---
need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ '$1' requis"; exit 127; }; }
need curl
need jq

# --- URL selon STAGE ---
if [[ "${STAGE}" != "prod" ]]; then
  BASE_DOMAIN="email-formatter.${STAGE}.heustach.fr"
else
  BASE_DOMAIN="email-formatter.heustach.fr"
fi
URL="https://${BASE_DOMAIN}/api/format"

# --- Vérifs ---
[[ -n "${EMAIL_FORMATTER_KEY}" ]] || { echo "❌ EMAIL_FORMATTER_KEY manquant (flag --key ou variable env)"; exit 1; }

# Récup du payload
if [[ -n "${PAYLOAD_FILE}" ]]; then
  [[ -f "${PAYLOAD_FILE}" ]] || { echo "❌ Fichier payload introuvable: ${PAYLOAD_FILE}"; exit 1; }
  PAYLOAD_CONTENT="$(cat "${PAYLOAD_FILE}")"
else
  [[ -n "${EMAIL_FORMATTER_PAYLOAD}" ]] || { echo "❌ Payload manquant (flag --payload ou --payload-file, ou variable EMAIL_FORMATTER_PAYLOAD)"; exit 1; }
  PAYLOAD_CONTENT="${EMAIL_FORMATTER_PAYLOAD}"
fi

# Validation rapide du JSON d'entrée
echo "${PAYLOAD_CONTENT}" | jq -e . >/dev/null || { echo "❌ Payload invalide (JSON)"; exit 1; }

echo "→ POST ${URL}"

# --- Appel HTTP ---
HTTP_CODE=$(curl -sS -o "${OUT_FILE}" -w "%{http_code}" \
  -X POST "${URL}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${EMAIL_FORMATTER_KEY}" \
  --data "${PAYLOAD_CONTENT}")

echo "HTTP_CODE=${HTTP_CODE}"

if [[ "${HTTP_CODE}" -lt 200 || "${HTTP_CODE}" -ge 300 ]]; then
  echo "---- Response body ----"
  cat "${OUT_FILE}" || true
  echo "-----------------------"
  echo "❌ Réponse non-2xx"
  exit 1
fi

# --- Validation structure de réponse ---
jq -e 'has("html") and has("text") and has("to") and has("subject") and has("from")' "${OUT_FILE}" >/dev/null \
  || { echo "❌ Clés manquantes dans la réponse (attendu: html,text,to,subject,from)"; cat "${OUT_FILE}"; exit 1; }

# --- Exports utiles (dotenv minimal) ---
{
  echo "EMAIL_FORMATTER_TO=$(jq -r '.to' "${OUT_FILE}")"
  echo "EMAIL_FORMATTER_SUBJECT=$(jq -r '.subject' "${OUT_FILE}")"
  echo "EMAIL_FORMATTER_FROM=$(jq -r '.from' "${OUT_FILE}")"
  echo "EMAIL_FORMATTER_HTML=$(jq -r '.html' "${OUT_FILE}")"
  echo "EMAIL_FORMATTER_TEXT=$(jq -r '.text' "${OUT_FILE}")"
  echo "EMAIL_FORMATTER_RESPONSE_FILE=${OUT_FILE}"
} > "${ENV_FILE}"

# --- Logs lisibles ---
echo "to:      $(jq -r '.to' "${OUT_FILE}")"
echo "subject: $(jq -r '.subject' "${OUT_FILE}")"
echo "from:    $(jq -r '.from' "${OUT_FILE}")"
echo "html:    $(jq -r '.html' "${OUT_FILE}")"
echo "text:    $(jq -r '.text' "${OUT_FILE}")"
echo "✅ OK — réponse JSON enregistrée dans ${OUT_FILE} et exports dans ${ENV_FILE}"
