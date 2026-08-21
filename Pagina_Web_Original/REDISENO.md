# Rediseño ONDIGITAL — dirección "Pulso Vital"

Rediseño completo de la landing institucional. Sin build, sin dependencias nuevas:
los mismos archivos estáticos, servidos igual que antes.

## Sistema de color

El sitio original vivía en azul marino + menta. Es la paleta por defecto de
cualquier sitio "tech": no decía nada sobre ONDIGITAL. La dirección nueva usa
tres materiales en vez de dos colores.

| Rol | Antes | Ahora | Token |
|---|---|---|---|
| Fondo | `#070d18` azul marino | `#0B1410` verdigris ink | `--bg` |
| Fondo 2 | `#0b1426` | `#12201A` | `--bg-2` |
| Acento primario | `#2B8AF7` azul | `#D8A24A` latón | `--accent` |
| Acento secundario | `#00E5B0` menta | `#9B8CFF` violeta | `--accent-2` |
| Texto | `#f0f4ff` blanco azulado | `#F2EFE4` pergamino | `--fg` |

**Deliberadamente intactos:** los colores de marca reales de las tecnologías
(React `#61DAFB`, Node `#68A063`, MySQL `#4479A1`, AWS `#FF9900`) y los puntos
de ventana macOS. Esos no son color de marca: son datos, y recolorearlos
habría sido mentir sobre el stack.

## Tipografía

| Rol | Antes | Ahora |
|---|---|---|
| Display | Avenir Next | **Fraunces** (serif variable) |
| Cuerpo | system-ui | **Inter** |
| Datos / etiquetas | ui-monospace | **JetBrains Mono** |

Se cargan desde Google Fonts con cadena de respaldo a Georgia / system-ui, así
que el sitio sigue leyéndose bien sin red.

## Logo de Vito

- Casco **achaflanado** (octagonal, corte de 16px) en lugar del rectángulo
  redondeado: lee como latón mecanizado, no como tablet genérica.
- Visor achaflanado a juego y gradiente de latón de tres paradas.
- **Antena con cuenta de contacto** violeta en la punta.
- Wordmark: `ON` en latón macizo, `DIGITAL` en pergamino con letterspacing.
  Una sola palabra, dos materiales, en vez de dos colores compitiendo.

El logo es idéntico en las tres piezas: nav, hero y pantalla de sala.

## Elemento firma: la línea de latido

Sale del propio lema de la empresa — *"Todo lo Vital es Digital"*. Vito recibe
una línea de ECG que se traza de izquierda a derecha y termina en un punto de
contacto contra su carcasa: la señal vital entrando al sistema para ser
digitalizada.

Es el único elemento llamativo del rediseño, a propósito. Durante la revisión
se quitaron: el pulso del logo del nav (ilegible a 52px, se leía como
artefacto), un segundo pulso dentro del visor, y los cuadros de píxeles
sueltos del hero. Un latido, no tres.

Respeta `prefers-reduced-motion`: el trazo se queda dibujado completo en vez
de recorrerse.

## Escalera de planes

Los tres planes ahora se distinguen por material antes de leer el precio:

- Starter → verdigris `#8FB89B`
- Business → latón `#D8A24A`
- Enterprise IA → violeta `#9B8CFF`

## Verificación

```bash
node quality-check.mjs     # pasa
python3 -m http.server 4173
```

- `quality-check.mjs`: **pasa** (estructura, foco visible, movimiento reducido,
  responsive, sin texto con gradiente, precios 19/49/99).
- **Cero errores de JS** en landing y en `pantalla-final/`.
- **Cero desbordamiento horizontal** a 375px.
- Todos los hooks que usa `script.js` intactos (`robot-eye-group`,
  `robot-pupil`, `robot-mouth-large`, `nav-robot-mouth`, `robot-pixels`…):
  las expresiones de Vito por scroll, el parpadeo y el clon de la sección
  Servicios siguen funcionando.

### Pendiente de revisar con red

Las fuentes se cargan desde `fonts.googleapis.com`, dominio bloqueado en el
entorno donde se hizo la revisión visual. Todo lo verificado se vio con la
cadena de respaldo (Georgia / system-ui) y se ve bien, pero **conviene abrir el
sitio con red para confirmar cómo cae Fraunces real** en los titulares.

Lo mismo aplica a `three.js`, que viene de cdnjs: la sección Tecnología usa
WebGL y en el entorno de revisión cayó a `services-static-mode`. Ese
comportamiento es idéntico al del sitio original, no una regresión.
