# OnStock — comandos de desarrollo y compilación
.PHONY: dev build build-linux build-windows clean test

# Desarrollo en Linux (recarga manual: Ctrl+C y volver a correr)
dev:
	go run . -port 8080 -no-open

# Compila ambos ejecutables de producción en dist/
build: build-linux build-windows

build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/onstock-linux .

build-windows:
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/onstock.exe .

test:
	go vet ./...
	go build ./...

clean:
	rm -rf dist
