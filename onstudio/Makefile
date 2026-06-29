# OnStudio — comandos de desarrollo y compilación
.PHONY: dev build build-linux build-windows clean test

# Desarrollo (recarga manual: Ctrl+C y volver a correr). Puerto 8100.
dev:
	go run . -port 8100 -no-open

build: build-linux build-windows

build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/onstudio-linux .

build-windows:
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/onstudio.exe .

test:
	go vet ./...
	go test ./...
	go build ./...

clean:
	rm -rf dist
