# OnStock — comandos de desarrollo y compilación
.PHONY: dev admin caja build build-linux build-windows clean test seed-demo seed-demo-force backup

# ── Procesos de la tienda ────────────────────────────────
# Admin / oficina: sistema completo (inventario, finanzas, reportes, Vito).
# Alias: make admin  ==  make dev
dev admin:
	go run . -port 8080 -no-open

# Cajero: SOLO registradora. En el PC del cajero use solo este comando.
# No expone finanzas, reportes ni administración. Abre /caja.html
# Puerto por defecto 8081 para poder correr admin (8080) y caja a la vez en demos.
# En la tienda real, el cajero suele tener su propio PC y puede usar PORT=8080.
caja:
	go run . -caja -port $${PORT:-8081} -no-open

# Datos demostrativos (demo escolar / Vito). force reemplaza si ya hay productos.
seed-demo:
	go run . -seed-demo -no-open

seed-demo-force:
	go run . -seed-demo-force -no-open

# Respaldo SQLite en ./backups (o BACKUP_DIR=...)
backup:
	@mkdir -p $${BACKUP_DIR:-backups}
	go run . -backup $${BACKUP_DIR:-backups} -no-open

# Compila ambos ejecutables de producción en dist/
build: build-linux build-windows

build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/onstock-linux .

build-windows:
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/onstock.exe .

test:
	go vet ./...
	go test ./...
	cd ../modules/vito && go test ./...
	cd ../modules/modkit && go test ./...
	cd ../modules/tenant && go test ./...
	cd ../modules/billing && go test ./...
	go build ./...

clean:
	rm -rf dist
