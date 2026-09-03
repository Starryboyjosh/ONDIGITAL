# OnRoute — plan vivo

App de autoventa para vendedores de ruta en Honduras. Flutter + Dart, teléfono
y escritorio con el mismo código.

## Estado

**Fase 1 (visual): terminada.** Paleta Pulso Vital propia de OnRoute, tipografía
empaquetada (Inter / JetBrains Mono / Fraunces, sin red), tokens, dos registros
—calle y torre— y la pantalla de identidad que los pone a la vista.

**Fase 2 (funcional): terminada en lo grueso.** Seis pantallas sobre un solo
repositorio, con mapa real, simulación de flota y Vito integrado.

**Fase 3 (repaso de calidad): hecha.** Las tres rutas de la flota salen de la
semilla (34 clientes, no 14), el camión regresa a la base al terminar, la
entrada de montos entiende el mismo formato que la app imprime, el repositorio
rechaza bultos inválidos y sobres negativos, y Vito no deja escapar ni el
nombre de un proveedor ni un `camionId` crudo.

Verificación al día de hoy: `flutter test` → **151 en verde, 2 saltadas**
(las capturas), `flutter analyze` → **sin hallazgos**.

## Lo que hay

| Pieza | Dónde | Qué sostiene |
|---|---|---|
| Dominio | `lib/domain/` | `Dinero` en centavos enteros (nunca `double`), `Ruta`, `Parada`, `Bodega`/`Casilla`, `Camion`+`Rastro`, `cuadrar()`, `vito_analista` |
| Repositorio | `lib/data/repositories/ruta_repository.dart` | La única puerta al estado. Invariante: lo que la parrilla dice que salió es exactamente lo que las paradas dicen que se entregó |
| Simulación | `lib/data/services/` | `SimuladorFlota` (presupuesto de **tiempo**, no de distancia), `OsrmService` (ruteo real gratuito, con caída a línea recta) |
| Armazón | `lib/ui/app_shell.dart` | Un repositorio, seis pantallas; navegación por ancho (barra abajo / riel lateral) |
| Torre | `features/torre/` | Mapa OSM real con atribución visible, camiones con rumbo y pulso al detenerse |
| Bodega | `features/bodega/` | La parrilla dibujada como está en el camión; el dibujo **es** los números |
| Ruta | `features/ruta/` | Cobro con tres montos separados (efectivo / transferencia / fiado), nunca colapsados |
| Cierre | `features/liquidacion/` | Las tres brechas por separado, cada una apuntando a un responsable distinto |
| Vito | `features/vito/` | Los hallazgos son aritmética en `domain`; solo la **voz** vive en `ui` y es intercambiable |

## Decisiones que no se negocian

- **Dinero en centavos enteros.** `double` no entra al dominio.
- **Tres brechas, nunca una.** Sumarlas destruye justo la información por la
  que el cierre existe: apuntan a bodega, vendedor y caja por separado.
- **Sin conteo, la brecha de carga es desconocida, no cero.** Nunca se muestra
  L 0.00 por algo que nadie contó.
- **La red nunca es obligatoria.** OSRM cae a línea recta y la app opera igual;
  hay pruebas que corren con un cliente HTTP que siempre falla.
- **La atribución de OpenStreetMap es condición de uso**, no adorno.
- **Vito describe la brecha, nunca a la persona.**
- **Vito es marca blanca.** Ni el nombre del proveedor ni un identificador
  interno (`cam-01`) salen a pantalla. Las variables de entorno son neutrales
  y compartidas con `modules/vito` (`VITO_API_KEY`, `VITO_BASE_URL`,
  `VITO_MODEL` con `VITO_MODELO` de alias, y `VITO_PROVIDER` con el
  vocabulario `local`/`nube`) y sin ellas Vito contesta por reglas. Un
  `VITO_MODEL` vacío es "sin nube", no "el default del proveedor". Lo que llega de la nube pasa además por un filtro de salida: el
  prompt pide, el filtro garantiza.
- **La semilla es de San Pedro Sula, también en los códigos.** RTN `0501`,
  fijo `25xx`, coordenadas en 15.4–15.6 N. Hay pruebas que lo sostienen.
- **Vocabulario:** marco en inglés (`Panel`, `MoneyText`), negocio en español
  (`Casilla`, `Parada`, `Liquidacion`, `Bodega`).

## Pendientes

- Regenerar `09-ruta-telefono.png`: la captura entregada es previa al arreglo
  del encabezado (dos cuentas separadas, cobradas vs. visitadas).
- Capturas de revisión visual: `flutter test test/captura_test.dart --run-skipped`
  (salen a `build/capturas/`). Ojo: `--tags` **no** las corre; el `skip:` de
  `dart_test.yaml` manda.
- Opcional: rebalancear la columna derecha de la pantalla de identidad a 1440 px.
- Opcional: bajar los tres archivos de licencia OFL a `assets/fonts/`.
- Opcional: el trazo de reserva (sin OSRM) mide en línea recta y por eso
  subestima el recorrido real de calle. Va marcado como estimado (`esReal:
  false`) y la UI no presume precisión, pero un factor de rodeo lo dejaría más
  cerca.
