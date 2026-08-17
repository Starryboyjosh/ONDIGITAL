# Landing ONDIGITAL

Sitio institucional estatico de ONDIGITAL. No requiere instalacion ni build.

## Verificacion

```bash
node quality-check.mjs
python3 -m http.server 4173
```

El chequeo bloquea regresiones basicas de estructura, accesibilidad, respuesta movil,
movimiento reducido y patrones visuales que degradan claridad (texto con gradiente,
movimiento elastico y numeracion decorativa de tarjetas). Antes de publicar, revisar la
landing en movil y escritorio para confirmar que no haya texto recortado, solapamientos o
desplazamiento horizontal.

## Modo presentacion (multiples monitores)

Montaje pensado para la sala: una pantalla de marca fija en un monitor y la landing
recorriendose sola en el otro.

### Monitor 1 — pantalla de marca

`pantalla-final/index.html`. Es una pieza autonoma: tiene su propio `pantalla.css` y
`pantalla.js` y **no depende** de `styles.css` ni de `script.js`, para que pueda quedarse
encendida horas sin arrastrar los observadores de scroll ni el WebGL de la landing.

Abrirla y pulsar `F` (o doble clic) para pantalla completa. El cursor se oculta solo a los
tres segundos. Muestra el lema, la promesa, el reloj local, las cinco capacidades rotando
y Vito como nucleo del sistema de modulos.

### Monitor 2 — landing con auto-scroll

El interruptor esta en `presentacion.config.js` y **solo se cambia editando ese archivo en
el servidor**. No hay boton, enlace, parametro de URL, atajo de teclado ni valor guardado
en el navegador que lo encienda. Con `autoScroll: false` el motor sale antes de registrar
un solo escuchador y la landing se comporta exactamente como siempre.

```js
// presentacion.config.js — en la copia que sirve ese monitor
autoScroll: true,
```

Luego abrir `index.html` en ese monitor y ponerlo en pantalla completa (F11). El recorrido
espera sobre el hero, baja hasta el formulario de contacto, espera, funde a negro y vuelve
a empezar. Si alguien toca la pantalla o mueve la rueda, cede el control y se reanuda solo
tras `reanudarTrasInactividadMs`.

`respetarMovimientoReducido` viene en `true`: si el sistema operativo pide movimiento
reducido, el recorrido no arranca y deja un aviso en consola. En la maquina de exhibicion,
donde el recorrido automatico es justamente lo que se quiere, ponerlo en `false`.

**Dejar `autoScroll: false` en la copia publica del sitio.**
