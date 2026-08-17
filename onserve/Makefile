# OnServe — comandos de desarrollo y compilación
.PHONY: dev seed-demo seed-demo-force build build-linux build-windows clean test

# Desarrollo en Linux (recarga manual: Ctrl+C y volver a correr)
dev:
	go run . -port 8090 -no-open

seed-demo:
	go run . -seed-demo

seed-demo-force:
	go run . -seed-demo-force

# Compila ambos ejecutables de producción en dist/
build: build-linux build-windows

build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/onserve-linux .

build-windows:
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/onserve.exe .

test:
	go vet ./...
	go test ./...
	go build ./...

clean:
	rm -rf dist
