# OnStock — comandos de desarrollo y compilación
#
# La implementación que CORRE es la de Node (server/). El código en Go
# (main.go, internal/) se conserva como implementación de referencia; para
# compilarlo hacen falta Go 1.22+ y las dependencias del go.mod, que esta
# máquina no tiene. Todos los objetivos de abajo usan Node salvo los que
# llevan el sufijo -go.
.PHONY: dev admin caja test equivalencia seed-demo seed-demo-force backup \
        dev-go admin-go caja-go test-go build build-linux build-windows clean

# ── Procesos de la tienda (Node 24, sin dependencias npm) ─
# Admin / oficina: sistema completo (inventario, finanzas, reportes, Vito).
# Alias: make admin  ==  make dev
dev admin:
	node server/index.js -port 8080 -no-open

# Cajero: SOLO registradora. En el PC del cajero use solo este comando.
# No expone finanzas, reportes ni administración. Abre /caja.html
# Puerto por defecto 8081 para poder correr admin (8080) y caja a la vez en demos.
# En la tienda real, el cajero suele tener su propio PC y puede usar PORT=8080.
caja:
	node server/index.js -caja -port $${PORT:-8081} -no-open

# Datos demostrativos (demo escolar / Vito). force reemplaza si ya hay productos.
seed-demo:
	node server/index.js -seed-demo -no-open

seed-demo-force:
	node server/index.js -seed-demo-force -no-open

# Respaldo SQLite en ./backups (o BACKUP_DIR=...)
backup:
	@mkdir -p $${BACKUP_DIR:-backups}
	node server/index.js -backup $${BACKUP_DIR:-backups} -no-open

# Pruebas del servidor (node:test de la biblioteca estándar).
test:
	node --test server/pruebas.test.js

# Compara el servidor de Node contra el binario de Go de dist/, endpoint por
# endpoint y después tabla por tabla. Necesita dist/onstock-linux (make build).
equivalencia:
	node server/tools/equivalencia.mjs

# ── Implementación de referencia en Go ───────────────────
# Requieren Go instalado; no se usan para correr el producto.
dev-go admin-go:
	go run . -port 8080 -no-open

caja-go:
	go run . -caja -port $${PORT:-8081} -no-open

test-go:
	go vet ./...
	go test ./...
	cd ../modules/vito && go test ./...
	cd ../modules/modkit && go test ./...
	cd ../modules/tenant && go test ./...
	cd ../modules/billing && go test ./...
	go build ./...

# Compila ambos ejecutables de la versión Go en dist/
build: build-linux build-windows

build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/onstock-linux .

build-windows:
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/onstock.exe .

clean:
	rm -rf dist
