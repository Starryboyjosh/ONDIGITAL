#!/usr/bin/env bash
# Levanta el emulador de Firestore con firebase/firestore.rules, corre las
# pruebas de reglas y apaga el emulador. No toca ningún proyecto real: usa el
# proyecto ficticio "demo-ondigital", que el emulador reconoce como demo y
# nunca deja salir a la red.
#
#   ./firebase/pruebas/ejecutar.sh
#
# Requisitos: firebase-tools, Java (el emulador de Firestore es un .jar) y
# python3. Si falta alguno, el script lo dice y sale sin fingir que pasó.
#
# Usa `emulators:exec` y no `emulators:start` a propósito: `start` deja el
# proceso Java vivo si el shell lo mata solo por PID, y un emulador viejo
# escuchando en el mismo puerto hace que las pruebas corran contra las reglas
# ANTERIORES y pasen o fallen por la razón equivocada. `exec` arranca, ejecuta
# y derriba todo el árbol.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$AQUI/.." && pwd)"
PUERTO="${FIRESTORE_EMULATOR_PORT:-8391}"

for req in firebase java python3; do
  command -v "$req" >/dev/null 2>&1 || { echo "falta '$req'; no puedo verificar las reglas" >&2; exit 127; }
done

if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -qE ":$PUERTO\b"; then
  echo "el puerto $PUERTO ya está ocupado; libéralo o usa FIRESTORE_EMULATOR_PORT=<otro>" >&2
  exit 1
fi

TRABAJO="$(mktemp -d)"
trap 'rm -rf "$TRABAJO"' EXIT

cp "$RAIZ/firestore.rules" "$TRABAJO/"
cat > "$TRABAJO/firebase.json" <<J
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "firestore": { "host": "127.0.0.1", "port": $PUERTO },
    "ui": { "enabled": false },
    "hub": { "host": "127.0.0.1", "port": $((PUERTO + 1)) },
    "logging": { "host": "127.0.0.1", "port": $((PUERTO + 2)) }
  }
}
J

cd "$TRABAJO"
FIRESTORE_EMULATOR_PORT="$PUERTO" firebase emulators:exec \
  --only firestore --project demo-ondigital \
  "python3 '$AQUI/probar_reglas.py'"
