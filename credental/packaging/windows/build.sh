#!/usr/bin/env bash
#
# Construye Credental-win_x64.exe: la aplicación de escritorio de Windows que
# reemplaza al "python3 -m http.server 8090" de la demo.
#
# Uso:  ./build.sh
# Salida: dist/Credental/Credental-win_x64.exe (un solo archivo, autocontenido)
#
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$(cd "$AQUI/../.." && pwd)"          # la carpeta credental/
NEU="@neutralinojs/neu@11.7.2"

cd "$AQUI"

for cmd in npx rsync; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "build.sh: falta '$cmd' en el PATH; no se puede construir." >&2
    exit 1
  fi
done

# 1) resources/ es la copia que se embebe en el .exe. Se excluye packaging/
#    porque vive DENTRO de credental/: sin la exclusión el bundle se copiaría a
#    sí mismo (bin/, dist/ y los ~21 MB del framework acabarían dentro del exe).
echo "==> Copiando la app a resources/ (sin packaging/)"
rm -rf resources
mkdir -p resources
rsync -a --exclude 'packaging/' "$APP/" resources/

# 2) bin/ son los binarios del framework Neutralino 6.9.0. Se descargan una sola
#    vez; no se versionan (van al .gitignore).
if [ ! -f bin/neutralino-win_x64.exe ]; then
  echo "==> Descargando los binarios del framework (solo la primera vez)"
  npx --yes "$NEU" update
fi

# 3) --embed-resources mete resources.neu dentro del propio .exe: se entrega un
#    único archivo, sin carpeta de apoyo al lado.
echo "==> Empaquetando"
rm -rf dist .tmp
npx --yes "$NEU" build --release --embed-resources

EXE="dist/Credental/Credental-win_x64.exe"
if [ ! -f "$EXE" ]; then
  echo "build.sh: el build terminó pero no apareció $EXE" >&2
  exit 1
fi

echo
echo "==> Listo: $AQUI/$EXE"
file "$EXE"
echo "Tamaño: $(stat -c %s "$EXE") bytes"
