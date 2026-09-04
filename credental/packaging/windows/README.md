# Credental — paquete de Windows

Convierte Credental en **una sola aplicación de escritorio** para Windows:
`Credental-win_x64.exe`, un archivo suelto que se copia a la máquina de la clínica
y se abre con doble clic.

Sustituye al arranque de demo que hay hoy documentado:

```bash
cd credental && python3 -m http.server 8090   # lo que este paquete reemplaza
```

Ese arranque obliga a tener una terminal abierta de fondo, muestra la barra de
direcciones y el puerto, y mata la aplicación en cuanto se cierra la consola. El
`.exe` abre una ventana propia, sin barra de direcciones, y al cerrarla termina el
proceso.

## Qué es por dentro

[Neutralinojs](https://neutralino.js.org) 6.9.0 (CLI `@neutralinojs/neu@11.7.2`):
un ejecutable nativo que levanta un servidor local en `127.0.0.1` y dibuja el
resultado en el WebView del sistema. Credental se embebe dentro del propio `.exe`
(`--embed-resources`), así que **no hay carpeta de apoyo al lado**: se entrega un
único archivo.

Credental no llama a ninguna API nativa (`Neutralino.*` no aparece en el código),
así que el puente nativo va apagado (`enableNativeAPI: false`) y no se incluye la
librería cliente. El `.exe` es, literalmente, Credental servida a sí misma.

## Cómo se construye

Requisitos en la máquina de build: `node` + `npx` y `rsync`. No hace falta Windows,
ni wine, ni un toolchain cruzado: el CLI descarga los binarios ya compilados del
framework y les inyecta los recursos.

```bash
cd credental/packaging/windows
./build.sh
```

La primera vez descarga los binarios del framework a `bin/` (~3 MB comprimidos);
las siguientes reutiliza esa copia.

## Qué se obtiene

```
dist/Credental/Credental-win_x64.exe    ← esto es lo que se entrega (~3,3 MB)
```

`neu build` genera además los binarios de Linux y macOS y un
`dist/Credental-release.zip`. Para este encargo solo importa el `.exe` de Windows;
lo demás es subproducto y se puede borrar.

**El `.exe` no se versiona.** `bin/`, `dist/`, `resources/`, `.tmp/` y
`node_modules/` están en el `.gitignore` de esta carpeta: lo que se versiona es el
código de build, y el ejecutable se reconstruye con un comando.

## Dos cosas que hay que saber en el equipo de destino

### 1. WebView2 no viene de fábrica en Windows 10

Windows 11 lo trae incluido. En Windows 10 puede faltar, y **si falta la ventana
abre en blanco** (el proceso arranca, pero no hay motor que dibuje). Se resuelve
instalando una vez el runtime oficial de Microsoft:

<https://developer.microsoft.com/microsoft-edge/webview2/>

Se descarga el *Evergreen Bootstrapper*, se ejecuta, y a partir de ahí Credental
abre normal. No requiere reiniciar.

### 2. El puerto 8090 tiene que estar libre

El puerto está **fijo a 8090 a propósito**, no es aleatorio.

Credental guarda laboratorios, comunicaciones, inventario, facturación y caja en
`localStorage`, y `localStorage` está atado al origen (`http://127.0.0.1:PUERTO`).
Con un puerto aleatorio en cada arranque, el origen cambia y esos cinco módulos
aparecerían **vacíos cada vez que se abre la aplicación**. Con 8090 fijo los datos
persisten entre sesiones, y además coincide con el origen que ya usan los
documentos de demo.

La contrapartida es que si otro programa ocupa el 8090, Credental no levanta. Para
comprobarlo en la máquina de destino:

```powershell
netstat -ano | findstr :8090
```

Si sale una línea, hay que cerrar ese programa (o cambiar `"port"` en
`neutralino.config.json` y reconstruir, asumiendo que los datos guardados con el
puerto anterior dejan de verse).

## Lo que este paquete no hace

- **No es un instalador.** Se entrega el `.exe` suelto, no un `setup.exe` con menú
  de inicio ni desinstalador: el generador de instaladores (NSIS/`makensis`) no está
  disponible en esta máquina y un instalador que no se puede construir tampoco se
  puede verificar. Copiar el `.exe` al escritorio es suficiente para la demo.
- **No está firmado.** SmartScreen mostrará el aviso de "editor desconocido" la
  primera vez: *Más información → Ejecutar de todas formas*. Firmarlo requiere un
  certificado de firma de código.
- **No cambia el modelo de datos.** Sigue siendo la Credental de demo, con su
  almacenamiento en el navegador. Empaquetarla no la convierte en almacenamiento
  clínico duradero.
