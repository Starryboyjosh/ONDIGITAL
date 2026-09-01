# OnRoute — plan vivo

App de autoventa para vendedores de ruta en Honduras. Flutter + Dart, teléfono
y escritorio con el mismo código.

## Estado

**Fase 1 (visual): terminada.** Paleta Pulso Vital propia de OnRoute, tipografía
empaquetada (Inter / JetBrains Mono / Fraunces, sin red), tokens, dos registros
—calle y torre— y la pantalla de identidad que los pone a la vista.

**Fase 2 (funcional): terminada en lo grueso.** Cinco pantallas sobre un solo
repositorio, con mapa real, simulación de flota y Vito integrado.

Verificación al día de hoy: `flutter test` → **133 en verde**,
`flutter analyze` → **sin hallazgos**, `flutter build linux --release` → **compila**.

## Lo que hay

| Pieza | Dónde | Qué sostiene |
|---|---|---|
| Dominio | `lib/domain/` | `Dinero` en centavos enteros (nunca `double`), `Ruta`, `Parada`, `Bodega`/`Casilla`, `Camion`+`Rastro`, `cuadrar()`, `vito_analista` |
| Repositorio | `lib/data/repositories/ruta_repository.dart` | La única puerta al estado. Invariante: lo que la parrilla dice que salió es exactamente lo que las paradas dicen que se entregó |
| Simulación | `lib/data/services/` | `SimuladorFlota` (presupuesto de **tiempo**, no de distancia), `OsrmService` (ruteo real gratuito, con caída a línea recta) |
| Armazón | `lib/ui/app_shell.dart` | Un repositorio, cinco pantallas; navegación por ancho (barra abajo / riel lateral) |
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
- **Vocabulario:** marco en inglés (`Panel`, `MoneyText`), negocio en español
  (`Casilla`, `Parada`, `Liquidacion`, `Bodega`).

## Pendientes

- Regenerar `09-ruta-telefono.png`: la captura entregada es previa al arreglo
  del encabezado (dos cuentas separadas, cobradas vs. visitadas).
- Capturas de revisión visual: `flutter test test/captura_test.dart --run-skipped`
  (salen a `build/capturas/`). Ojo: `--tags` **no** las corre; el `skip:` de
  `dart_test.yaml` manda.
- El borrado de `onserve/` está **preparado pero sin commitear**, junto con la
  limpieza de sus menciones en el repo. Falta la decisión de commitear.
- Opcional: rebalancear la columna derecha de la pantalla de identidad a 1440 px.
- Opcional: bajar los tres archivos de licencia OFL a `assets/fonts/`.
