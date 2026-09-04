# ONDIGITAL — Pase de calidad para producción (beta)

> Estado vivo de la sesión: se actualiza en cada paso.
> Encargo: analizar el repositorio, auditar y mejorar Credental, OnStock y
> OnRoute, dejarlo con aspecto de producto terminado, preparar a Vito, cargar
> datos semilla completos y optimizar la landing sin que pierda gracia visual.

## Restricción que manda sobre todo lo demás

**El enlace de Firebase no cambia.** El QR ya está generado e impreso junto al
banner. Proyecto `ondigital-landing`, `Pagina_Web_Original/firebase.json` con
`hosting.public: "."`. Se puede tocar el contenido del sitio; no la URL, ni el
nombre del proyecto, ni la carpeta que se publica.

Otras vallas: Credental conserva su propia paleta (`#004aad` / `#004d66` /
`#cb6ce6`) y no adopta Pulso Vital; Vito nunca muestra el nombre de un
proveedor de IA; no entran datos reales, credenciales ni llaves al repositorio.

---

## Hecho

### Reubicación a San Pedro Sula ✅
- `semilla_tegucigalpa.dart` → `semilla_san_pedro_sula.dart`, 34 clientes
  reescritos sobre colonias reales de SPS en tres rutas (Centro ·
  Rivera Hernández · El Prado), base de operaciones en Colonia Altiplano,
  Casa 14 → `LatLng(15.5185, -88.0115)`.
- Invariantes preservados a propósito para que las 133 pruebas sigan
  significando algo: 14/11/9 clientes, 24 casillas de bodega, 14 pedidos, los
  montos exactos de cada parada, los rangos telefónicos y los RTN.
- Guarda geográfica en `semilla_test.dart` reapuntada al área metropolitana
  de SPS.
- Assets de banner vertical y de propuesta borrados (cero referencias en
  código antes de borrarlos).
- Verificación: `flutter analyze` limpio, 133 pruebas en verde.

### OnStock — datos y arranque ✅
- **Compras ya no abre vacía.** `clearDemoTables()` borraba
  `purchase_orders` / `purchase_order_items` y `SeedDemo()` no creaba ninguna.
  Ahora hay 28 órdenes: 24 recibidas del histórico mensual (dos por mes, una
  por proveedor) más cuatro abiertas que muestran los otros estados —
  cancelada, dos enviadas y un borrador.
- **Histórico de doce meses.** El tablero abría con once meses en cero y una
  sola barra, y el mes en curso daba pérdida. Ahora se generan 478 ventas con
  semilla fija y reproducible, mes a mes y en el orden real —primero entra la
  compra, después se vende contra ella—, con el volumen creciendo a lo largo
  del año y el costo subiendo ~12 % de punta a punta. El margen que reportan
  los informes es el que resultó, no un número puesto a mano.
- **Gastos fijos recurrentes** los doce meses (59 en total), cada uno en su día
  del mes, para que el estado de resultados no salga inflado y el gasto
  acumulado del mes crezca junto con el mes.
- **Conteo físico de cierre** que devuelve las existencias a los números que
  declara la tabla de productos, para que la pantalla de Productos sea el
  dataset diseñado: los cinco SKU en rojo que sostienen las preguntas a Vito
  y los tres estancados siguen exactamente donde tienen que estar.
- Empresa demo y proveedor A reubicados en San Pedro Sula / Villanueva.
- `web/index.html` cargaba `/js/firebase/connection.js`, que no existe en disco
  ni en la historia de git: un 404 garantizado en cada carga. Eliminado.
- El arranque decía `provider=opencode` en la misma ventana que ve el dueño del
  negocio. Ahora dice "motor en la nube" / "motor local", que es lo que importa
  y lo que la marca permite.
- Marco del banner alineado y `(TGU)` corregido.
- Verificación: `gofmt` limpio, `go build`, `go vet`, `go test ./...` y las
  pruebas de `modules/{vito,modkit,tenant,billing}` en verde; seed corrido
  contra base limpia y revisado en SQLite y por API.

### Landing — modo presentación ✅
- `velocidadPxPorSegundo: 0` era un resto de depuración: el motor lo sube a un
  mínimo de 4 px/s, así que la página quedaba prácticamente congelada.
  Restaurado a 102.
- `autoScroll` quedaba en `true` en la copia pública, que es justo lo que el
  propio archivo dice que no se debe hacer. En `false`; el monitor de feria lo
  enciende editando el archivo, como estaba previsto.
- Red de seguridad nueva en `presentacion.js`: por debajo de 900 px de ancho el
  modo no arranca aunque el archivo se despliegue encendido, para que quien
  llega desde el QR en su teléfono no encuentre la página moviéndose sola bajo
  el dedo.

---

### OnStock — calidad visual del frontend ✅
- **La paleta retirada seguía viva, escrita en `oklch()`.** El grep por hexes no
  la veía: `oklch(62% 0.22 254)` es `#0082FF` y `oklch(75% 0.17 184)` es
  `#00CFBA` — el azul y la menta de la paleta vieja. Pintaban el botón
  primario, el ítem activo del menú, el halo del robot y la animación de marca
  del tema "colores de la empresa". Todo pasado a latón + violeta.
- **El botón primario del tema oscuro no pasaba AA**: blanco sobre latón da
  2.26:1. Ahora lleva tinta verdigris encima del latón, 8.28:1.
- **Píldora verde vacía en el sidebar de todas las pantallas de admin.** La
  regla `.access-mode-badge` fijaba `display: block` y pisaba el atributo
  `hidden` que pone `access.js`. Corregido con `:not([hidden])`, más una
  defensa general `[hidden] { display: none !important; }` en el reset, porque
  el mismo patrón estaba a punto de repetirse con los enlaces de admin.
- **La gráfica de doce meses estaba rota en el tema oscuro**: rejilla y
  etiquetas iban a `#e9eaf2` / `#9298b3` fijos, invisibles sobre fondo oscuro.
  Ahora todo el color sale de tokens y sigue al tema.
- El eje Y saltaba a 50k con barras de 26k (media altura desperdiciada): la
  escalera de topes es más fina y ahora cierra en 25k.
- El mes en curso se leía como un desplome. Se dibuja translúcido, con contorno
  punteado y su propia entrada en la leyenda.
- **"Ventas recientes" mostraba agosto encima de septiembre**: `ListSales`
  ordenaba por `id DESC` (orden de inserción), no por fecha. Es un fallo de
  producto, no de la semilla: cualquier venta registrada con fecha atrasada se
  colaba al tope. Ahora ordena por `sale_date DESC, id DESC`.
- Las ventas de vitrina se sumaban encima del histórico sin descontarse de él,
  así que agosto cerraba +59 % y parecía un error de datos. Ahora se descuentan
  del presupuesto del mes donde caen: +22 %, dentro de la curva.
- El chat de Vito abría con ~380 px de vacío debajo del saludo. Ahora la
  conversación crece desde abajo y la burbuja se limita a 64ch.
- Verificación: `gofmt` limpio, `go vet`, `go test ./...` y los cuatro módulos
  compartidos en verde; capturas de ambos temas revisadas.

---

### Credental — auditoría y comprobación en navegador ✅
- 11 arreglos del pase estático: páginas huérfanas enlazadas al menú,
  credenciales del login plegadas, fuga de hashes cerrada, escapado de HTML,
  nombres y fechas coherentes, `confirm()` nativo sustituido, código muerto
  borrado.
- **Comprobado en navegador de verdad** (sesión sembrada, 17 páginas servidas):
  el menú generado desde `main.js` monta bien los 17 módulos — era el cambio
  con más riesgo del pase estático.
- **El botón primario de toda la app no pasaba AA.** `--action` era un
  alias del morado de identidad `#cb6ce6`: blanco encima da 3.08:1 y como texto
  de enlace sobre el crema, 2.87:1. Ahora el token de acción tiene su propio
  tono —el mismo morado oscurecido, `#a723cd`— con 5.58:1 y 5.2:1.
  `--brand-purple` no se toca: sigue pintando lo decorativo (avatar, ítem
  activo, acento del logo), que es lo que fija la guía de marca.
- En tema oscuro el morado brilla sobre el fondo, así que el texto de encima
  pasó a tinta (`--on-action`): 5.73:1 en lugar de los mismos 3.08:1.
- **`.btn` nunca reseteaba `text-decoration`**: los cinco botones que son `<a>`
  (Nueva Cita, Ingresar Paciente…) salían subrayados por el navegador.
- **El menú se cortaba en pantallas de portátil.** Con 17 módulos, a 900 px de
  alto el ítem quedaba partido por la mitad sin ninguna pista de que hubiera
  más: se lee como un fallo de maquetación. Filas más compactas, barra de
  desplazamiento siempre visible, y `main.js` acerca el ítem activo — antes se
  podía entrar a Caja o Configuración sin ver dónde estaba uno parado. En móvil
  el panel recupera el tamaño táctil, que allí sí manda.
- **La pantalla de Vito era un panel de depuración.** Mostraba `local-first ·
  disabled · db ok`, la versión `v0.2.0` y los identificadores internos de las
  herramientas (`credental.agenda.list_day`…) a la dueña de la clínica. Ahora
  las capacidades llevan nombre en claro —Citas del día, Saldos por cobrar,
  Resumen de expediente, Panorama de la clínica—, el estado de los datos está
  redactado para quien opera, y la nota comercial dice lo que importa: Vito es
  opcional y solo consulta, nunca modifica. De paso, el chat abría con el
  saludo flotando arriba y ~270 px de vacío debajo.
- `caja.html` mostraba un cuarto método de pago, "Link de pago", con el valor
  literal "Placeholder". El producto maneja tres métodos y `normMetodo()`
  colapsa cualquier otro a Efectivo: la celda no podía llenarse nunca. Se
  quita, en lugar de inventar un medio de pago que no existe.

---

### Landing — optimización sin perder gracia visual ✅
- **El enlace del QR se confirmó, no se supuso**: `https://ondigital-landing.web.app/`
  responde 200 con el título del sitio (`ondigital.hn` no resuelve). Eso es lo que
  destrabó poner `canonical`, `og:url` y `og:image` en absoluto — antes se habían
  omitido justamente por no saberlo. La URL, el proyecto y la carpeta publicada
  siguen intactos.
- **El enlace viajaba pelado.** No había una sola etiqueta Open Graph: compartir
  el sitio por WhatsApp mostraba una tira de texto sin imagen, y el QR impreso
  existe para que la gente comparta ese enlace. Ahora hay tarjeta social
  completa (`assets/brand/og-ondigital.jpg`, 1200×630, 78 KB) con la marca, el
  lema y "San Pedro Sula · Honduras". Las URL van absolutas a propósito:
  WhatsApp y Facebook no resuelven rutas relativas en `og:image`.
- **three.js venía de cdnjs sin `integrity`.** Cualquier cambio en ese CDN se
  ejecutaba con todos los permisos en la página a la que apunta un QR impreso.
  Ahora vive en `vendor/three.min.js` (copia literal r128, MIT, con
  `vendor/README.md` explicando origen y actualización): se cierra el vector de
  manipulación y se ahorra un DNS+TLS extra antes del primer byte.
- **Y ya no bloquea la primera pantalla.** Son ~600 KB (≈150 KB comprimidos) que
  no pintan un píxel del héroe —la escena empieza un scroll más abajo— y los
  pagaba justo el visitante que llega del QR con datos móviles. Se carga en
  `load` o al primer gesto, lo que ocurra antes. Con `prefers-reduced-motion` ni
  se descarga: la sección ya era estática por CSS y por JS. Si no llega, cae al
  modo estático que el código ya tenía.
- **`firebase-debug.log` (40 KB) estaba dentro de la carpeta publicada** y sin
  ignorar en git: se habría desplegado. Cerrado en `.gitignore` y en
  `hosting.ignore`, junto con el resto de bitácoras del emulador.
- Cabeceras de producción nuevas y **verificadas contra el emulador real**, no
  supuestas: caché de 30 días para imágenes y `vendor/`, 1 día para js/css,
  más `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`. El
  orden de las reglas importa —Firebase suma las cabeceras de todas las que
  casan y ante la misma clave gana la última—, así que `vendor/**` va después
  de `**/*.js`; queda anotado en el propio `firebase.json`.
- iOS recibía el maestro de 1024 px (100 KB) para un icono de 180. Ahora hay
  `apple-touch-icon.png` de 180×180 (14 KB) y el maestro se queda en el repo
  pero fuera del despliegue.
- **Página 404 propia** con la marca: sin ella, una ruta mal tecleada del QR
  aterriza en la pantalla genérica de Firebase, que se lee como "esto está
  roto". Va con estilos propios y sin JS (5 KB) para que cargue aunque el CSS
  grande sea lo que falló.
- Peso del despliegue: **2092 KB → 1015 KB** (426 KB sin contar el three.js
  recién alojado, que se pide diferido y comprimido pesa ~150 KB).
- Verificación: sitio completo servido por el emulador de Firebase y recorrido
  en navegador real — cero recursos 4xx/5xx, los cinco retratos WebP cargan, la
  escena 3D de servicios renderiza, en móvil no hay desbordamiento horizontal y
  el primer pintado queda en 648 ms.

### Vito — repaso de punta a punta y marca blanca ✅
- **La guarda de marca de Credental tapaba una sola mención.** El regex no
  llevaba el flag `g`, así que `replace` sustituía la primera aparición y dejaba
  pasar la segunda: "Soy Claude. Claude puede ayudarte" salía a pantalla con la
  mitad del nombre intacto. Arreglado y espejado con la del backend.
- **Las dos guardas solo conocían `gpt-4`.** `GPT-5`, `Gemini`, `DeepSeek`,
  `Mistral`, `Qwen`, `Copilot` y `Grok` pasaban enteros. Ahora ambas cubren
  familias completas con límites de palabra. `llama` queda fuera a propósito:
  en español es un verbo corriente ("se llama Ana") y sustituirlo rompería el
  texto en vez de protegerlo.
- En Go la expresión se compilaba de nuevo por cada término en cada respuesta;
  ahora va compilada una sola vez, y el nombre del proveedor activo se sigue
  tapando aparte por si no está en el catálogo.
- **El mensaje de arranque nombraba al proveedor.** Cuando falta la clave, el
  error decía literalmente `VITO_OPENCODE_API_KEY` y mandaba a la web del
  proveedor, en la misma ventana que —según el comentario del propio código—
  mira el dueño del negocio. Ahora las variables que edita el cliente son
  neutras: `VITO_API_KEY`, `VITO_BASE_URL`, `VITO_MODEL`, y `VITO_PROVIDER`
  acepta `local` / `nube`. Los nombres viejos (`VITO_OPENCODE_*`,
  `OPENCODE_API_KEY`, `mock`, `opencode`) siguen valiendo como alias para no
  romper ningún `.env` ya escrito. La capa de providers sí nombra al proveedor
  —es su trabajo— y no se toca.
- **OnRoute y el módulo compartido habían elegido nombres distintos** para lo
  mismo (`VITO_MODELO` vs `VITO_MODEL`). Se fija `VITO_MODEL` como canónico
  —los vecinos `VITO_ENABLED`/`VITO_PROVIDER`/`VITO_LOCALE` están en inglés— y
  se acepta `VITO_MODELO` como alias en ambos lados: un mismo `.env` sirve para
  los dos productos.
- `.env.example`, `modules/vito/README.md` y `docs/demo-fase1-vito.md`
  reescritos con los nombres neutros.
- `credental/js/vito/connector.js` se borró y no queda ni una referencia.
- Verificación: `gofmt` limpio, `go vet` y `go test ./...` en verde en los cuatro
  módulos compartidos y en OnStock; `node --check` sobre el módulo de Credental;
  pruebas nuevas para las dos filtraciones (repeticiones y familias de modelo),
  para que el español legítimo no se altere, para los alias de variables y para
  que el error de arranque no nombre al proveedor.

### Raíz del repositorio ✅
- **`install.sh` era el instalador de la CLI de Grok**, 415 líneas de un tercero
  descargadas por accidente en la raíz y commiteadas. No lo referenciaba nada.
  Quien clonara el repo y corriera `./install.sh` esperando montar ONDIGITAL se
  instalaba una herramienta ajena desde una URL externa. Borrado.
- **`dashboard_ondigital(1).html`**: copia byte a byte de
  `dashboard_ondigital.html`, el clásico archivo descargado dos veces. Borrado.
- **`Pagina_Web_Original/.firebaserc` no estaba en git** aunque es el archivo
  que fija el destino del despliegue (`ondigital-landing`) — justo la
  restricción del QR impreso. Ahora está rastreado.
- El README no mencionaba OnRoute, que ya es el cuarto producto del repo; y
  describía a Vito como si actuara solo ("genera reportes, cotizaciones,
  correos") cuando hoy es de solo lectura salvo una acción confirmada en
  OnStock. Ambas cosas corregidas.
- `modules/tenant/plan.go` no pasaba `gofmt`. Formateado.

### Firebase — reglas de Firestore ✅

- **`firebase/firestore.rules` era la plantilla que genera la consola**, intacta
  con su comentario de ejemplo: `allow read, write: if request.time <
  timestamp.date(2026, 7, 1)`. Eso no es una regla de seguridad, es un
  temporizador. Sin ninguna comprobación de identidad: hasta esa fecha,
  cualquiera con el `projectId` leía, escribía o borraba la base entera; pasada
  la fecha, deniega todo y la app falla sin explicación. Las dos mitades malas.
- Reemplazada por **denegar por defecto con aislamiento por inquilino** sobre
  `/clinicas/{clinicaId}/<colección>/{documento}`: sin sesión no pasa nada; con
  sesión solo pasa la clínica que dice el custom claim `clinicaId`; `usuarios`
  es de solo lectura y solo la ficha propia (cambiar roles desde el navegador
  sería escalar privilegios contra las propias reglas); la historia clínica no
  se borra desde el cliente, se anula por estado como las ventas de OnStock; y
  una colección que no esté en la lista explícita queda cerrada, así que crear
  una nueva no la abre por accidente.
- **Verificado, no asumido**: `firebase/pruebas/ejecutar.sh` levanta el emulador
  de Firestore con estas reglas contra el proyecto ficticio `demo-ondigital`,
  corre 30 casos (anónimo, miembro, vecino de otra clínica, sesión sin claim, y
  la matriz de roles completa) y apaga el emulador. 30/30. Comprobado además
  por mutación: quitar el aislamiento por inquilino tumba 6 casos, y meter
  `usuarios` en la lista de colecciones operativas tumba 2 —los permisos se
  **suman** entre reglas que coinciden con la misma ruta, así que esa exclusión
  no es decorativa.
- Los roles no se inventan: espejan `RolePermissions` de
  `modules/tenant/plan.go` (`admin` todo · `gerente` leer/escribir/reportes/
  usuarios · `empleado` leer/escribir · `viewer` leer), incluido su `default` de
  solo lectura para un rol ausente o desconocido.
- El runner usa `firebase emulators:exec` y no `emulators:start`: `start` deja
  el proceso Java vivo si el shell lo mata por PID, y un emulador viejo en el
  mismo puerto hace que las pruebas corran contra las reglas **anteriores** y
  pasen por la razón equivocada. Pasó durante este trabajo: 5 casos "fallaron"
  hasta descubrir que el emulador que respondía era el de la ronda anterior.
- No rompe nada porque hoy **ningún producto habla con Firestore**: Credental es
  local-first sobre `sessionStorage`, OnStock usa SQLite y OnRoute guarda en el
  dispositivo. Las reglas dibujan la frontera antes de que exista tráfico, que
  es el único momento barato para hacerlo.
- `firestore.indexes.json` era también la plantilla de consola (JSON con
  comentarios `//`); ahora es un archivo limpio y válido.
- Nuevo `firebase/README.md`: qué es y qué **no** es esta carpeta (no publica la
  landing; el hosting con el QR impreso vive en `Pagina_Web_Original/` y apunta
  a otro proyecto), cómo verificar, cómo desplegar nombrando el proyecto —
  `.firebaserc` sigue sin proyecto a propósito, para que un `firebase deploy`
  distraído no publique reglas sobre una base que no era— y las tres cosas que
  faltan antes de que esto sostenga datos reales: Authentication de verdad en
  Credental, el claim `clinicaId` firmado por un backend de confianza, y el alta
  de clínicas y usuarios fuera del navegador.

### Análisis de la encuesta ✅

- **El generador producía el informe con la paleta retirada.**
  `scripts/mejorar_reporte.py:695` construía el CSS con navy `#071426`, menta
  `#00e5b0` y azul `#3b82f6`, los tres prohibidos. Ahora es Pulso Vital, con
  tema claro por defecto y las variantes AA (`#8C6A2A`, `#6C35ED`) donde el
  fondo es claro. Barrido posterior de hexes retirados en toda la carpeta: sin
  coincidencias.
- **Los PNG y el PDF no tenían generador.** Eran huérfanos en el azul por
  defecto de matplotlib (`#1f77b4`), imposibles de rehacer. Nuevo
  `scripts/generar_visuales.py`: regenera los 15 gráficos, la infografía y el
  PDF de 14 páginas desde los datos, con guardas anti-fabricación que abortan
  la build si una cifra recalculada no coincide con la publicada.
- **Una asociación no defendible se presentaba como significativa.**
  `Almacenamiento vs percepción de pérdida` es una tabla 7×5 con 20 de 35
  celdas de frecuencia esperada < 5 (mínimo 0.45): la aproximación
  chi-cuadrado no se sostiene. Ahora su p-value dice `no fiable` y lleva la
  advertencia en la tabla, en el dashboard y en la página de metodología.
- Porcentajes que se sumaban sobre valores ya redondeados (114.1% donde el
  cálculo da 114.0%), denominadores sin declarar en las cabeceras, p-values con
  17 dígitos, pruebas estadísticas sin nombrar (lo que hacía parecer
  contradictorio que una relación apareciera con V de Cramér 0.442 y con rho de
  Spearman −0.201), y dos vistas distintas de la Q3 sin explicar la diferencia:
  todo corregido.
- Paleta categórica de 7 series derivada de la marca, validada contra
  daltonismo (peor par bajo deuteranopia ΔE 8.1) y con rampa ordinal de un solo
  matiz para que sobreviva en escala de grises. El heatmap cambia el rótulo a
  pergamino cuando la celda es oscura, que era un defecto real de legibilidad.
- **Sin PII**: el cuestionario no pide nombre, negocio ni contacto. Barrido de
  correo/teléfono/RTN/DNI en fuentes y entregables: cero. `raw/` sin tocar.
- Verificado: 59 comprobaciones cruzadas (raw ↔ métricas ↔ tablas ↔ informe ↔
  ambos HTML) en verde, 17 artefactos byte-idénticos entre dos corridas
  completas, y las dos páginas HTML revisadas en navegador real en claro y
  oscuro, escritorio y móvil, sin errores de consola, sin recursos externos y
  sin scroll horizontal.
- **La advertencia de fondo se mantuvo intacta a propósito**: `LEEME.txt` dice
  que la estructura temporal y textual sugiere datos simulados o altamente
  guiados —las 321 respuestas abiertas encajan todas en la misma plantilla—, y
  ningún gráfico afirma lo contrario. Es evidencia exploratoria, no una muestra
  representativa del mercado hondureño.

### OnRoute ✅

- 170 pruebas en verde (eran 151 al empezar), `flutter analyze` limpio.
- `VITO_MODEL` canónico con `VITO_MODELO` de alias, para que un solo `.env`
  sirva a los cuatro productos.
- **`VITO_PROVIDER` no existía en OnRoute**: un `.env` compartido con
  `VITO_PROVIDER=local` apagaba la nube en OnStock y **la dejaba encendida en
  OnRoute**, lo contrario de lo que pide el operador y sin ninguna señal.
  Añadido con los mismos canónicos (`local`/`nube`) y alias; un valor
  desconocido cae a `local` y deja rastro, en vez de encender la nube en
  silencio por un dedazo.
- **No había filtro de salida**: la marca blanca dependía solo del prompt de
  sistema. Añadido `marcaBlanca()` sobre toda respuesta remota, con las mismas
  dos lecciones que el resto del repo —`replaceAll` y no `replaceFirst`, y
  familias de modelos en vez de versiones sueltas— y `llama` excluido a
  propósito porque en español es un verbo corriente.

### Design system ✅

- La carpeta iba una generación atrás del resto del repo: superficies del navy
  retirado, **cuatro tipografías fuera de marca** (Syne, Outfit, DM Sans, Space
  Grotesk) **descargadas de Google Fonts** —justo lo que AGENTS.md prohíbe,
  porque la UI tiene que sobrevivir sin red— y acentos de Tailwind
  (`#34d399`, `#ffb859`, `#f87171`) en los estados.
- Cada una de las siete fichas redefinía su propia paleta y ya habían derivado
  entre sí. Ahora hay un solo `design-system/tokens.css`: color, tipografía,
  radios, sombras, curvas de animación, `:focus-visible` (los componentes
  heredaban `outline: none` sin sustituto) y `prefers-reduced-motion`.
- **`tokens/colors.html` no mostraba un solo valor hex**, y AGENTS.md lo cita
  como fuente de la paleta. Reescrita con el hex y el contraste en cada muestra,
  tablero de ajedrez para las translúcidas, y tres bloques separados a
  propósito: marca, variantes AA para fondo claro, paleta propia de Credental, y
  las plantillas por vertical rotuladas como **trabajo de cliente, no la
  identidad de ONDIGITAL** (estaban sin rotular y se leían como marca).
- `word-break: break-all` partía los rótulos a media palabra ("6.23: 1",
  "bg-primary (oscur o)"). Fuera.
- **Los datos de ejemplo eran chilenos.** El campo de identidad pedía un RUT
  (`18.452.129-K`, "Formato: 00.000.000-X") en un producto que opera en
  Honduras. Ahora DNI de 13 dígitos, RTN de 14, `+504` y montos en lempiras.
- Contrato ARIA completo en el combobox de búsqueda y en la tabla
  (`role`/`aria-expanded`/`aria-activedescendant`, `<caption>`, `scope`,
  `aria-label` en cada botón de icono, que antes eran emojis pelados).
- La tabla desbordaba el `body` en móvil y escondía la columna de acciones;
  ahora scrollea dentro de su propio contenedor. Botones a 40 px de alto, y el
  primario pasa a tinta sobre latón: blanco sobre `#D8A24A` da 2.1:1.
- **La carpeta no tenía índice**: había que adivinar los nombres de archivo.
  Nuevo `design-system/index.html` con vista previa en vivo de cada ficha.
- **El mapa Graphify no tenía ni OnRoute ni Vito** —los dos añadidos más
  recientes del repo— y dos áreas usaban el mismo verde. Reconstruido a 9 áreas
  con color propio, 24 nodos y 35 relaciones, con el clúster de OnRoute y el
  módulo compartido de Vito, y las fichas de `firebase`, `cred-db` y `site`
  reescritas contra la realidad de hoy. `graphify.css` cargaba el bloque de
  tokens retirado completo (navy + menta, 11 variables de área con **cero usos**
  y en desacuerdo con el mapa): reemplazado por Pulso Vital. Distribución
  rehecha y verificada sin una sola colisión de nodo o rótulo.
- Verificación: las ocho fichas servidas y recorridas en navegador real —título
  correcto, Inter resuelto, sin desbordamiento horizontal— y el mapa comprobado
  con la caché desactivada (24 nodos, 35 aristas, 9 filtros, 0 aristas
  huérfanas).

### Vito — mensajes de arranque del módulo compartido ✅

- El texto de "falta la clave" mandaba a `onstock/.env`, pero el módulo lo usan
  OnStock **y** OnRoute: al operador de OnRoute lo mandaba a un archivo que no
  existe en su producto. Ahora dice "el archivo .env del producto".
- `"vito: using mock fallback"` salía **en inglés** a la consola del operador.
  Ahora es "Vito quedó en modo local".
- Los prefijos `vito:` los volvía a poner cada capa anfitriona, así que el
  mensaje llegaba con el prefijo triplicado. Quitados en origen.
- Se revisó —y se descartó— un aviso recibido sobre que el error de motor
  desconocido podía filtrar el alias interno del proveedor: `normalizeProvider`
  mapea ese alias a sí mismo y lo atrapa su propio `case`, así que la rama
  `default` solo puede devolver lo que el propio usuario escribió.
- Verificación: `go test ./...` en `modules/vito` (34 pruebas) y `go build` +
  `go test ./...` en OnStock, su consumidor.

### Credental — pase de producción sobre los 17 módulos ✅

**Maquetación móvil rota, con controles fuera de alcance:**

- **Cobranzas abría a 640 px en un teléfono de 390.** El `<span class="sr-only">`
  dentro del `<th>` es `position: absolute` y, sin ningún antecesor posicionado,
  se resolvía contra el bloque contenedor inicial: escapaba del
  `overflow-x: auto` de la tabla y arrastraba el ancho de toda la página.
  Un `position: relative` en el contenedor lo cierra.
- **Agenda: el filtro por profesional quedaba fuera de pantalla.** El
  `overflow-x` estaba en el envoltorio del calendario, así que la barra de
  herramientas se estiraba hasta los 760 px de la rejilla.
- **Odontograma: los dientes 18/17/16 y 48/47/46 eran inalcanzables.** Un
  `align-items: center` sobre un contenedor que desborda recorta el borde de
  entrada y no deja forma de volver a él.
- **"Dashboard" desaparecía del menú en las páginas internas**: el arreglo del
  pase anterior centraba siempre el ítem activo, incluso cuando el menú no
  necesitaba desplazarse. Ahora solo desplaza si el activo no se ve.

**Contraste AA sobre texto real** — tres tokens nuevos de solo-texto
(`--color-green-text`, `--color-amber-text`, `--color-red-text`) aplicados
donde el color vivo pintaba letras, conservando el vivo en iconos, bordes y
barras de gráfica, donde 3:1 basta. Casos concretos: el importe "DEUDA" a
4.39:1, el conmutador "¿Es una demostración?" a 3.08:1, un rojo de una paleta
anterior olvidado en `odontograma.html`, y `--color-gray-dark` (#8b949e, 2.87:1
sobre el crema) usado como texto de cuerpo en cinco sitios — ningún gris más
claro pasa AA sobre ese fondo, así que esos usos bajan a `--color-gray` y el
token queda documentado como solo-gráficos.

**Objetivos táctiles y defectos visuales**: mínimos bajo `pointer: coarse` en
botones pequeños, menús, cierre de modal y fichas de Vito —los del Dashboard y
Pacientes llevaban `style="padding: 5px 10px"` en línea y ninguna clase, así que
la regla no los alcanzaba—, rejilla de métricas a dos columnas en móvil, y
`white-space: nowrap` en las píldoras, porque "VENCE PRONTO" se partía en dos
líneas y crecía por encima de la fila.

**Verificación real, no supuesta**: 17 páginas en escritorio 1440×900 y en móvil
390×844, sin desbordamiento horizontal y **con cero errores y cero avisos de
consola** en ambas; barrido de contraste sobre el login y los 17 módulos donde
los únicos avisos restantes son tres falsos positivos conocidos (dos logotipos,
exentos por WCAG 1.4.3, y unas iniciales sobre degradado que el muestreador no
sabe leer); flujos conducidos de punta a punta en Vito, Laboratorios y Usuarios;
`node --check` sobre los 23 archivos JS. Sin `alert`/`confirm`/`prompt` nativos,
sin TODO ni lorem, sin enlaces muertos y **sin una sola URL externa** — DM Sans
está alojado en el propio repo con su licencia OFL.

**La configuración real de Firebase ya no está en el árbol.** Comprobado:
`ondigital-d39aa` no aparece en ningún archivo de `credental/`,
`config.example.js` es una plantilla con cadenas vacías, `config.local.js` está
en `.gitignore` y no existe en disco, y **ninguna página carga `connection.js`**
— la sincronización es opt-in y hoy está apagada.

Credental conserva su paleta: `#004aad` / `#004d66` / `#cb6ce6` intactos y
ningún color de Pulso Vital se coló.

---

## Estado

Los cinco frentes están cerrados: Credental, OnStock, OnRoute, la landing y el
sistema de diseño, más Vito, las reglas de Firestore, el análisis de la encuesta
y la raíz del repositorio.

Comprobación final sobre el árbol combinado: `gofmt` limpio, `go build`,
`go vet` y `go test ./...` en verde en OnStock y en los cuatro módulos
compartidos; `node --check` en verde en Credental; `git diff --check` limpio en
todo el repositorio; `ondigital-landing` con `public: "."` sin tocar, así que
**el enlace del QR impreso sigue siendo el mismo**.

Todo está sin commitear: `HEAD` sigue en `b8b88d5`.

### Pendiente, a criterio de quien decida

- OnStock guarda `caja_exit_pin` en claro y lo sirve por `GET /api/settings`:
  el PIN del modo cajero se lee desde las herramientas del navegador. Aceptable
  en beta; no puede salir así como control de acceso real.
- Credental sigue siendo demo-grade en autenticación y almacenamiento. Las
  reglas de Firestore ya dibujan la frontera, pero faltan Authentication de
  verdad, el claim `clinicaId` firmado por un backend de confianza y el alta de
  clínicas fuera del navegador.
- `assets/ondigital-logo-generated.png` y `assets/brand/vito.png` quedan en el
  repositorio pero fuera del despliegue.
