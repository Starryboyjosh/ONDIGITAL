# Graphify ONDIGITAL

Vista visual repo-local para el pase Graphify de ONDIGITAL.

- `index.html` abre el mapa operativo sin build ni dependencias externas.
- Los artefactos oficiales generados viven en `../../graphify-out/`.
- La guia de ejecucion y alcance vive en `../../docs/graphify.md`.

## Que es y que no es este mapa

`graphify-map.js` **se escribe a mano**: es una vista curada de los cuatro
productos y sus riesgos, no la salida del generador. Las metricas del panel
izquierdo (nodos, relaciones, comunidades) sí vienen de la corrida real y estan
en `graphify-out/`.

Al editarlo:

- El color de cada area vive **solo** en `graphData.areas`. `graphify.css` no
  guarda una copia; antes tenia once variables de area duplicadas, sin un solo
  uso y ya en desacuerdo con el mapa.
- `x`, `y` y `size` estan colocados a mano y no hay motor de fuerzas que los
  separe. `size` es el radio del circulo, pero **el rotulo puede ser mas ancho
  que el circulo**: la separacion real hay que medirla contra el ancho del texto,
  no contra el radio. Con `~3.6 px` por caracter del rotulo y `~2.85 px` por
  caracter del subtitulo se predice bien el desborde.
- El `viewBox` es `0 0 1330 955` y el contenido ocupa de `x 72..1262` y de
  `y 27..926`. Si un nodo nuevo se sale de ahi, hay que ampliar el `viewBox` en
  `index.html`, no encogerlo contra el borde.

Para revisar en navegador:

```bash
python3 -m http.server 4173
```

Luego abrir `http://localhost:4173/design-system/graphify/`.
