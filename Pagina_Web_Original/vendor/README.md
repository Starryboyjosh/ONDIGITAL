# vendor/

Dependencias de terceros servidas desde nuestro propio dominio.

## three.min.js — three.js r128, licencia MIT

Motor de la escena 3D de la sección **Servicios** (`initServicesParallax` en
`../script.js`). Copia literal de
`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`.

Se guarda aquí en lugar de pedirlo a un CDN por dos razones:

1. **Integridad.** El `<script>` iba sin `integrity`, así que cualquier cambio
   en el CDN —o en la ruta hasta él— se ejecutaba con permisos completos en la
   página a la que apunta el QR impreso. Sirviéndolo nosotros, el archivo es el
   que desplegamos.
2. **Disponibilidad.** El visitante típico llega escaneando el QR con datos
   móviles. Un dominio extra son DNS + TLS antes del primer byte, y si el CDN
   está lento o bloqueado la sección cae a su versión estática sin que podamos
   hacer nada.

`script.js` no lo pide en el arranque: lo carga cuando el navegador queda libre
(evento `load`) o al primer gesto, lo que ocurra antes. La primera pantalla no
lo necesita y así no compite con la fuente ni con la hoja de estilos.

Para actualizarlo: descargar la build UMD minificada de la versión deseada,
reemplazar el archivo y comprobar la sección Servicios en escritorio y en móvil.
