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
