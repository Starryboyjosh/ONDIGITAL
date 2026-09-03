---
name: graphify-3d
description: "Use ONLY when explicitly asked for a 3D, visual, cinematic or presentation-grade view of a graphify knowledge graph (\"vista 3D\", \"algo mas visual\", \"para presentar\", \"como Obsidian\"). Renders graphify-out/graph.json as a self-contained offline WebGL2 neural-network visualization with five view modes. Never run this automatically after /graphify — it is on-request only."
---

# /graphify-3d

Capa visual de `/graphify`. Toma el `graph.json` que ya existe y produce **un solo
archivo HTML autocontenido** con la red en 3D: puntos con halo, aristas aditivas,
niebla por profundidad y animacion de crecimiento.

No sustituye al HTML de graphify (que es la herramienta de trabajo: buscar,
navegar, auditar). Esto es la pieza para enseñar.

## Cuando usarla

Solo cuando la piden. Disparadores tipicos: "una vista 3D", "algo mas visual",
"para la presentacion", "que se vea imponente", "como Obsidian".

**No se ejecuta despues de `/graphify` ni al actualizar el grafo.** Es cara
(layout por fuerzas) y su salida es un entregable, no un subproducto.

## Uso

```bash
graphify3d .                                  # usa ./graphify-out/graph.json
graphify3d ruta/al/repo -o red.html --open
graphify3d . --view galaxia --theme tinta     # anula el config.js
```

Si no hay grafo, avisa y pide correr `/graphify .` primero.

## Configuracion

La vista, el tema y los accesos rapidos se eligen **en codigo**, no en el UI.
Se leen de `graphify3d.config.js` en este orden:

1. `--config RUTA`
2. `<repo>/graphify3d.config.js`
3. `config.js` de esta skill (el que viene por defecto)

Las banderas de linea de comandos mandan sobre el archivo. El objeto que exporta
debe ser JSON valido: se extrae y se parsea, **no se evalua**.

```js
export default {
  "view": "neural",          // neural · galaxia · orbital · estratos · esfera
  "theme": "noche",          // noche · abismo · pulso · tinta
  "chrome": [],              // vacio = solo la red; ver "Arranca limpio"
  "hint": true,              // aviso "? teclas" al abrir
  "shortcuts": [
    { "label": "Vito", "match": ["vito"] }
  ]
};
```

Cada acceso rapido aisla los nodos cuyo id o archivo contenga alguno de los
terminos; acepta varios alias porque un producto puede haberse renombrado
(OnRoute era OnServe). Los que no encuentran nada se omiten en vez de quedar
como botones muertos. **"Mayor nexo"** se calcula siempre: es el nodo con mas
relaciones, con su vecindario.

## Opciones

| Opcion | Default | Que hace |
|---|---|---|
| `RUTA` | `.` | `graph.json`, una carpeta `graphify-out/`, o un repo que la contenga |
| `-o, --output` | `<repo>/graphify-out/red-3d.html` | archivo de salida |
| `--view` | del config | `neural`, `galaxia`, `orbital`, `estratos`, `esfera` |
| `--theme` | del config | `noche` (negro azulado), `abismo` (negro), `pulso` (verdigris), `tinta` (violeta) |
| `--config` | ver arriba | ruta a un `graphify3d.config.js` |
| `--chrome` | vacio | regiones visibles al abrir, separadas por comas |
| `--no-hint` | — | sin el aviso de teclas al abrir |
| `--max-nodes` | `2500` | poda por grado; avisa en pantalla cuantos quedaron fuera |
| `--iters` | `400` | iteraciones del layout; ya converge en 400 |
| `--title` | nombre del repo | titulo del encabezado |
| `--open` | — | abre el resultado en el navegador |

## Las cinco vistas

- **Red neuronal** — disposicion por fuerzas. La forma la dicta la conectividad real.
- **Galaxia** — cada comunidad se separa en su propio lobulo.
- **Orbital** — capas concentricas por distancia a los nodos dios.
- **Estratos** — planos apilados por carpeta raiz.
- **Esfera** — todo en la superficie; las aristas cruzan por dentro.

La vista se fija en el config; no hay selector en pantalla. Las teclas `1`-`5`
siguen cambiandola para explorar, con un morph interpolado, no un salto.

## Arranca limpio

Al abrir **no hay interfaz**: solo la red. Todo panel se enciende con su tecla,
y un aviso de 4 s recuerda que existe `?`. Se apaga con `"hint": false`.

| Tecla | Enciende |
|---|---|
| `A` | accesos rapidos y titulo |
| `C` | controles (buscar, color, filtros) |
| `L` | leyenda |
| `E` | estadisticas |
| `I` | datos al senalar y al seleccionar (tooltip e inspector) |
| `U` | todo de golpe |
| `?` o `H` | la lista de teclas |

Para que alguna venga encendida de fabrica, ponla en `chrome` del config o pasa
`--chrome controls,legend`. `--no-hint` quita el aviso de arranque.

## Interaccion

**Click repetido sobre un nodo** estrecha el foco por niveles:

1. el nodo y sus vecinos directos
2. el nodo y su vecino con mas relaciones
3. solo el nodo

El cuarto click deselecciona. Lo que queda fuera del foco **se apaga del todo**,
no se atenua, y las estadisticas pasan a contar lo encendido.

## Teclas

`1`-`5` vistas · `shift+1`-`shift+9` accesos rapidos · `Espacio` giro ·
`R` repetir crecimiento · `T` tabla · `P` guardar PNG · `/` buscar ·
`Esc` limpiar todo.

Los digitos se leen por `e.code`, no por `e.key`: `shift+1` no produce `1` en la
mayoria de teclados.

Girar, Tabla y PNG no tienen boton a proposito. Siguen accesibles por teclado.

## Decisiones que conviene no deshacer

- **Sin red.** WebGL2 escrito a mano (`gl.POINTS` + `gl.LINES` con mezcla
  aditiva), sin three.js, sin CDN, sin webfonts. El HTML abre sin internet.
- **Cada comunidad lleva su color propio** (OKLCh, angulo aureo, tres bandas de
  luminosidad). Es una decision explicita del usuario por encima de la regla de
  la skill `dataviz`, que limita a 3 hues validados: con 150+ grupos ningun
  color por si solo identifica nada. Lo compensan la leyenda con las 8 mayores,
  el aislamiento por click, los accesos rapidos, la busqueda y la tabla. Si
  alguna vez hay que volver a la version accesible, el tope esta en `BANDS` y
  `spin_palette`.
- **El fondo es casi negro** (`noche`) para que los hues tengan donde contrastar.
- **La confianza va en el trazo, no en el color.** Relacion inferida = punteada.
- **La mezcla aditiva evita ordenar por profundidad.** Por eso no hay z-sort ni
  depth test: el resultado es independiente del orden de dibujado.
- **El layout se normaliza por radio medio** en las cinco vistas, para que la
  camara encuadre igual al morfear.

## Archivos

- `graphify3d.py` — CLI, paleta OKLCh y layout (numpy si esta, con fallback si no).
- `config.js` — configuracion por defecto (vista, tema, accesos rapidos).
- `template/shell.html`, `template/viewer.css`, `template/viewer.js` — se
  incrustan en el HTML final.

Vive fuera de `~/.claude/skills/graphify/` a proposito: `graphify install`
reescribe esa carpeta y se llevaria esta capa por delante.
