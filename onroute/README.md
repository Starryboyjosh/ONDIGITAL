# OnRoute

App de **autoventa** (van sales) para vendedores de ruta en Honduras, hecha por
ONDIGITAL. Un solo código corre en el teléfono del vendedor, en la tablet
apoyada en el tablero y en la computadora de la oficina.

El día de trabajo entero cabe en cinco pantallas: se ve la flota, se carga el
camión, se vende en la parada, se cuadra al regreso, y Vito explica lo que
pasó.

## Cómo correrlo

```bash
flutter pub get
flutter run                 # teléfono, emulador o escritorio
flutter test                # pruebas (las capturas quedan fuera por defecto)
flutter analyze             # sin hallazgos
```

Sin ninguna configuración extra la app arranca con el día de demostración de
San Pedro Sula: tres camiones, 34 clientes y una ruta a medio camino. No hace
falta backend, cuenta ni llave de nada.

## Las cinco pantallas

| Pantalla | Para qué sirve |
|---|---|
| **Torre** | Mapa real de la flota, con rumbo, velocidad y el atraso de cada ruta. |
| **Bodega** | La parrilla del camión dibujada como está físicamente: fila, columna y bultos. |
| **Ruta** | La parada: qué se pidió, qué se entregó y cómo se pagó. |
| **Cierre** | La liquidación del día, con las tres brechas separadas. |
| **Vito** | El asistente: contesta sobre los mismos datos que ven las otras pantallas. |
| **Identidad** | La marca y los dos registros visuales, a la vista para revisarlos. |

## Cómo está armado

```
lib/
  domain/    modelos y aritmética pura: Dinero, Ruta, Parada, Bodega, cuadrar()
  data/      repositorio, servicios (OSRM, simulador, Vito) y la semilla del día
  ui/        core (tema, tokens, formatos, widgets) + features por pantalla
```

La regla de dependencias va en una sola dirección: `ui` conoce a `data`, `data`
conoce a `domain`, y `domain` no conoce a nadie. El dominio no importa Flutter.

## Decisiones que no se negocian

- **Dinero en centavos enteros.** `Dinero` guarda un `int`; `double` no entra
  al dominio. `Dinero.desdeDecimal` existe solo para la semilla y para lo que
  se teclea en pantalla.
- **Tres brechas, nunca una.** El cierre separa la brecha de venta (vendedor),
  la de caja (caja) y la de carga (bodega). Sumarlas destruiría justo la
  información por la que el cierre existe: cada una apunta a alguien distinto.
- **Sin conteo, la brecha de carga es desconocida, no cero.** La app nunca
  muestra L 0.00 por algo que nadie contó.
- **La red nunca es obligatoria.** El ruteo real sale de OSRM y, si no
  contesta, cae a línea recta y lo dice; la app opera igual. Las fuentes van
  empaquetadas, no descargadas.
- **La atribución de OpenStreetMap es condición de uso**, no adorno.
- **Vito describe la brecha, nunca a la persona.** "Faltan L 430 del sobre",
  no "el vendedor se quedó con L 430".
- **Vocabulario:** el marco en inglés (`Panel`, `MoneyText`), el negocio en
  español (`Casilla`, `Parada`, `Liquidacion`, `Bodega`).

## Vito

Vito es el asistente de ONDIGITAL. Con qué motor está hecho es un detalle de
infraestructura intercambiable, y en pantalla nunca aparece: solo "Vito".

Sin configuración, Vito contesta por reglas, sin red y de forma determinista.
Para conectarlo a un motor compatible con `chat/completions` —en la nube o en
el servidor del propio cliente— se pasan las tres variables al compilar:

```bash
flutter run \
  --dart-define=VITO_API_KEY=... \
  --dart-define=VITO_BASE_URL=https://... \
  --dart-define=VITO_MODEL=...
```

Si falta cualquiera de las tres, Vito sigue funcionando por reglas. La llave
nunca vive en el repositorio.

Los nombres son los mismos que usa `modules/vito` en Go, para que un solo
`.env` de ONDIGITAL sirva para todos los productos. `VITO_MODELO` —el nombre
que llevaba OnRoute antes— sigue aceptándose como alias; si vienen las dos,
manda `VITO_MODEL`.

`VITO_PROVIDER` elige el motor, con el mismo vocabulario que el resto de
ONDIGITAL:

| Valor | Efecto |
| --- | --- |
| (vacío) | Autodetección: con llave, URL y modelo → nube; si no → local |
| `local` (alias `offline`, `mock`) | Motor local **aunque haya credenciales** |
| `nube` (alias `cloud`, `api`, `opencode`) | Nube si hay credenciales completas; si no, local |
| cualquier otra cosa | Local, y queda el aviso en la consola de debug |

Un `VITO_MODEL` vacío significa **"sin modelo, uso el motor local"**, no "usa
el que traiga el proveedor por defecto". Es a propósito y se aparta del Go:
`modules/vito` puede rellenar ese hueco porque tiene una capa de proveedores
que legítimamente conoce el default de cada uno. OnRoute no la tiene, así que
un default de proveedor aquí sería cablear una empresa dentro del producto.

Además del prompt, lo que devuelve la nube pasa por un filtro de marca blanca
antes de llegar a la pantalla: un prompt es una petición, no una garantía, y
hay motores que se presentan por su nombre a la primera pregunta.

## Pruebas

`flutter test` corre todo menos las capturas, que rasterizan pantallas enteras
y tardan minutos. Para generarlas a `build/capturas/`:

```bash
flutter test test/captura_test.dart --run-skipped
```

Ojo: `--tags` no las corre; manda el `skip:` de `dart_test.yaml`.
