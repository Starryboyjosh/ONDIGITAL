const graphData = {
  // Los colores salen de la paleta "Pulso Vital" o se separan a proposito de
  // ella. Antes "Todo" (#35c2a6) y "Credental" (#32c6b3) eran practicamente el
  // mismo verde: en la leyenda no habia forma de distinguir un punto del otro.
  areas: [
    { id: "all", label: "Todo", color: "#F2EFE4" },
    { id: "site", label: "Sitio", color: "#D8A24A" },
    { id: "credental", label: "Credental", color: "#4E9BE0" },
    { id: "onstock", label: "OnStock", color: "#6FC59B" },
    { id: "onroute", label: "OnRoute", color: "#E58FC0" },
    { id: "vito", label: "Vito (IA)", color: "#9B8CFF" },
    { id: "design", label: "Design system", color: "#B09A86" },
    { id: "docs", label: "Docs y skills", color: "#B3CE5B" },
    { id: "risk", label: "Riesgos", color: "#E85D4E" },
  ],
  nodes: [
    { id: "root", area: "all", label: "ONDIGITAL", kind: "Repo", x: 670, y: 95, size: 68, subtitle: "multi-producto", detail: "Raiz del repositorio: sitio institucional, los cuatro productos, prototipos, docs, skills y configuracion." },
    { id: "site", area: "site", label: "Pagina Web", kind: "Landing", x: 120, y: 265, size: 48, subtitle: "institucional", detail: "Sitio principal de ONDIGITAL en Pagina_Web_Original/. Es lo que publica Firebase Hosting en ondigital-landing y lo que abre el QR impreso: la URL no cambia." },
    { id: "credental", area: "credental", label: "Credental", kind: "Producto", x: 350, y: 265, size: 58, subtitle: "clinica dental", detail: "Prototipo HTML/CSS/JS para gestion clinica dental en Honduras. Conserva su paleta propia y queda fuera de la marca Pulso Vital. Auth y almacenamiento son demo-grade." },
    { id: "onstock", area: "onstock", label: "OnStock", kind: "Producto", x: 700, y: 265, size: 58, subtitle: "mini ERP", detail: "Go y SQLite con UI vanilla embebida para POS, inventario, compras, ventas, ISV y reportes. Corre en el equipo del negocio, sin nube." },
    { id: "onroute", area: "onroute", label: "OnRoute", kind: "Producto", x: 1055, y: 265, size: 56, subtitle: "autoventa", detail: "App Flutter de autoventa y reparto en San Pedro Sula: carga de bodega, ruta del dia, cobro en sitio, liquidacion y torre de control." },
    { id: "design", area: "design", label: "Design System", kind: "Soporte", x: 1215, y: 760, size: 46, subtitle: "tokens UI", detail: "Tokens y componentes compartidos en design-system/. tokens.css es el espejo de DESIGN.md seccion 0; las fichas se abren sin build y sin red." },
    { id: "docs", area: "docs", label: "Docs", kind: "Conocimiento", x: 150, y: 760, size: 46, subtitle: "arquitectura", detail: "Documentacion funcional y tecnica: modelo de negocio, plan maestro, arquitectura, seguridad demo/prod y Graphify." },
    { id: "skills", area: "docs", label: "Skills", kind: "Agentes", x: 305, y: 765, size: 44, subtitle: "instrucciones", detail: "Guias internas para productos, UI, datos, seguridad, QA, Flutter y backend." },
    { id: "firebase", area: "risk", label: "Firebase", kind: "Persistencia opcional", x: 490, y: 775, size: 44, subtitle: "rules/indexes", detail: "Reglas de Firestore en firebase/. Ya no es la plantilla de consola con temporizador: hoy deniega por defecto, aisla por clinica con el claim clinicaId y refleja la matriz de roles de modules/tenant. Se verifica con 30 pruebas contra el emulador (firebase/pruebas/ejecutar.sh)." },
    { id: "graphify", area: "docs", label: "Graphify", kind: "Mapa repo", x: 235, y: 880, size: 46, subtitle: "graphify-out", detail: "Artefactos generados: graph.html, GRAPH_TREE.html, GRAPH_REPORT.md y graph.json. Este mapa se escribe a mano y es una vista curada, no una salida del generador." },
    { id: "vito", area: "vito", label: "Vito", kind: "Asistente IA", x: 700, y: 770, size: 46, subtitle: "modulo comun", detail: "Asistente de marca blanca en modules/vito. El motor es intercambiable (nube o equipo local) y nunca se nombra al proveedor en pantalla. Trabaja sobre los datos reales del negocio y es opcional (plan Enterprise AI)." },

    { id: "cred-html", area: "credental", label: "*.html", kind: "Entrypoints", x: 215, y: 425, size: 34, subtitle: "pantallas", detail: "Pantallas por modulo que cargan db.js, auth.js, main.js y el JS del modulo." },
    { id: "cred-css", area: "credental", label: "CSS parciales", kind: "Sistema visual", x: 355, y: 445, size: 40, subtitle: "styles.css", detail: "Manifest CSS dividido en base, layout, components, modules y themes." },
    { id: "cred-main", area: "credental", label: "main.js", kind: "Shell UI", x: 500, y: 425, size: 36, subtitle: "nav + tema", detail: "Navegacion central, tema, helpers, branding multiempresa y formato HNL." },
    { id: "cred-db", area: "risk", label: "db.js", kind: "Datos demo", x: 280, y: 585, size: 42, subtitle: "sessionStorage", detail: "API de repositorio que consume toda la app. Es local-first sobre sessionStorage: ninguna pantalla carga hoy el SDK de Firebase, asi que no hay sincronizacion en curso. No es almacenamiento clinico duradero." },
    { id: "cred-auth", area: "risk", label: "auth.js", kind: "Auth demo", x: 435, y: 600, size: 34, subtitle: "roles UI", detail: "Login y guardas de ruta de demostracion, resueltas en el navegador. No es una frontera de seguridad productiva." },

    { id: "go-main", area: "onstock", label: "main.go", kind: "Servidor", x: 625, y: 425, size: 34, subtitle: "HTTP embed", detail: "Arranca el servidor local, las rutas HTTP y la UI embebida." },
    { id: "httpapi", area: "onstock", label: "httpapi", kind: "API REST", x: 765, y: 425, size: 40, subtitle: "handlers", detail: "Endpoints de ventas, compras, productos, reportes, exports y codigos de barra." },
    { id: "store", area: "onstock", label: "store", kind: "Negocio", x: 758, y: 590, size: 42, subtitle: "SQLite", detail: "Persistencia SQLite y reglas de inventario, costo promedio ponderado, reversos, ISV/ISR y reportes." },
    { id: "on-web", area: "onstock", label: "web SPA", kind: "Frontend", x: 612, y: 585, size: 38, subtitle: "vanilla JS", detail: "UI embebida con api.js, paginas, charts, tema blanco por defecto y componentes." },

    { id: "or-ui", area: "onroute", label: "features", kind: "Pantallas", x: 950, y: 425, size: 36, subtitle: "Flutter", detail: "bodega, ruta, liquidacion, torre, identidad y Vito, cada una con sus vistas y widgets bajo lib/ui/features." },
    { id: "or-datos", area: "onroute", label: "repositorio", kind: "Datos en equipo", x: 1105, y: 420, size: 36, subtitle: "en el equipo", detail: "ruta_repository.dart guarda la ruta, las visitas y el cuadre en el propio telefono: el vendedor trabaja sin senal y sincroniza despues." },
    { id: "or-semilla", area: "onroute", label: "semilla", kind: "Datos precargados", x: 1080, y: 590, size: 38, subtitle: "San Pedro Sula", detail: "semilla_san_pedro_sula.dart trae clientes, productos y una ruta real de la ciudad, para que la app abra con datos desde el primer arranque." },
    { id: "or-ruteo", area: "onroute", label: "ruteo", kind: "Servicios", x: 928, y: 590, size: 32, subtitle: "OSRM + flota", detail: "osrm_service.dart calcula el recorrido y simulador_flota.dart mueve la flota cuando no hay backend, para que la torre de control tenga que mostrar." },
  ],
  edges: [
    ["root", "site", "contiene"], ["root", "credental", "contiene"], ["root", "onstock", "contiene"], ["root", "onroute", "contiene"],
    ["root", "design", "contiene"], ["root", "docs", "documenta"], ["root", "skills", "guia"], ["root", "firebase", "configura"], ["root", "graphify", "mapea"],
    ["credental", "cred-html", "renderiza"], ["credental", "cred-css", "estiliza"], ["credental", "cred-main", "coordina"],
    ["cred-html", "cred-db", "consume"], ["cred-main", "cred-auth", "protege"], ["cred-db", "firebase", "sin conexion hoy"],
    ["onstock", "go-main", "arranca"], ["go-main", "httpapi", "sirve"], ["httpapi", "store", "muta"], ["onstock", "on-web", "embebe"],
    ["on-web", "httpapi", "consume"], ["store", "firebase", "sin dependencia"],
    ["onroute", "or-ui", "pinta"], ["onroute", "or-datos", "persiste"], ["or-datos", "or-semilla", "arranca con"],
    ["or-ui", "or-ruteo", "consulta"], ["or-ruteo", "or-datos", "alimenta"],
    ["onstock", "vito", "integra"], ["onroute", "vito", "integra"], ["vito", "store", "consulta"],
    ["site", "firebase", "publica el QR"],
    ["docs", "graphify", "define"], ["skills", "graphify", "obliga"], ["design", "graphify", "visualiza"],
    ["cred-auth", "cred-db", "riesgo"], ["firebase", "cred-db", "riesgo"],
  ],
};

const state = {
  filter: "all",
  selected: "root",
  query: "",
  riskMode: false,
};

const svg = document.getElementById("repo-graph");
const edgeLayer = document.getElementById("edge-layer");
const nodeLayer = document.getElementById("node-layer");
const filterList = document.getElementById("filter-list");
const inspector = document.getElementById("inspector-content");
const search = document.getElementById("graph-search");
const stageTitle = document.getElementById("stage-title");

const nodeById = new Map(graphData.nodes.map((node) => [node.id, node]));

function colorFor(area) {
  return graphData.areas.find((item) => item.id === area)?.color || "#F2EFE4";
}

function visibleNode(node) {
  const matchesFilter = state.filter === "all" || node.area === state.filter || node.id === "root";
  const searchable = `${node.label} ${node.kind} ${node.subtitle} ${node.detail}`.toLowerCase();
  const matchesQuery = !state.query || searchable.includes(state.query);
  const matchesRisk = !state.riskMode || node.area === "risk" || node.id === "root";
  return matchesFilter && matchesQuery && matchesRisk;
}

function connectedToSelected(id) {
  if (!state.selected) return false;
  return graphData.edges.some(([from, to]) => (from === state.selected && to === id) || (to === state.selected && from === id));
}

function renderFilters() {
  filterList.innerHTML = "";
  graphData.areas.forEach((area) => {
    const count = area.id === "all" ? graphData.nodes.length : graphData.nodes.filter((node) => node.area === area.id).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${state.filter === area.id ? " is-active" : ""}`;
    button.innerHTML = `
      <span class="chip-label"><span class="chip-dot" style="background:${area.color}"></span>${area.label}</span>
      <span class="chip-count">${count}</span>
    `;
    button.addEventListener("click", () => {
      state.filter = area.id;
      state.riskMode = false;
      render();
    });
    filterList.appendChild(button);
  });
}

function renderEdges() {
  edgeLayer.innerHTML = "";
  graphData.edges.forEach(([fromId, toId, label], index) => {
    const from = nodeById.get(fromId);
    const to = nodeById.get(toId);
    if (!from || !to) return;
    const fromVisible = visibleNode(from);
    const toVisible = visibleNode(to);
    if (!fromVisible || !toVisible) return;

    const active = fromId === state.selected || toId === state.selected;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", `edge${active ? " is-active" : ""}`);
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    line.setAttribute("data-edge", index);
    edgeLayer.appendChild(line);

    if (active) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "edge-label");
      text.setAttribute("x", (from.x + to.x) / 2);
      text.setAttribute("y", (from.y + to.y) / 2 - 6);
      text.setAttribute("text-anchor", "middle");
      text.textContent = label;
      edgeLayer.appendChild(text);
    }
  });
}

function renderNodes() {
  nodeLayer.innerHTML = "";
  graphData.nodes.forEach((node) => {
    const visible = visibleNode(node);
    const selected = node.id === state.selected;
    const related = connectedToSelected(node.id);
    const muted = state.selected && !selected && !related;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", `node-group${selected ? " is-selected" : ""}${muted ? " is-muted" : ""}`);
    group.setAttribute("transform", `translate(${node.x} ${node.y})`);
    group.setAttribute("role", "button");
    group.setAttribute("tabindex", "0");
    group.setAttribute("aria-label", `${node.label}: ${node.kind}`);
    group.addEventListener("click", () => selectNode(node.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectNode(node.id);
      }
    });

    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("class", "node-ring");
    ring.setAttribute("r", node.size);
    group.appendChild(ring);

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("class", "node-dot");
    dot.setAttribute("r", Math.max(10, node.size * 0.2));
    dot.setAttribute("cy", -node.size + 8);
    dot.setAttribute("fill", colorFor(node.area));
    group.appendChild(dot);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "node-label");
    label.setAttribute("y", -2);
    label.textContent = node.label;
    group.appendChild(label);

    const subtitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
    subtitle.setAttribute("class", "node-subtitle");
    subtitle.setAttribute("y", 17);
    subtitle.textContent = node.subtitle;
    group.appendChild(subtitle);

    if (!visible) group.classList.add("is-muted");
    nodeLayer.appendChild(group);
  });
}

function selectNode(id) {
  state.selected = id;
  render();
}

function renderInspector() {
  const node = nodeById.get(state.selected);
  if (!node) return;
  const relations = graphData.edges
    .filter(([from, to]) => from === node.id || to === node.id)
    .map(([from, to, label]) => {
      const other = nodeById.get(from === node.id ? to : from);
      return other ? `${label}: ${other.label}` : label;
    });

  stageTitle.textContent = node.label;
  inspector.innerHTML = `
    <h3 class="inspector-title">${node.label}</h3>
    <span class="inspector-kind">${node.kind}</span>
    <p>${node.detail}</p>
    <ul class="detail-list">
      <li><strong>Area</strong><span>${graphData.areas.find((area) => area.id === node.area)?.label || "General"}</span></li>
      <li><strong>Rol</strong><span>${node.subtitle}</span></li>
      <li><strong>Relaciones</strong><span>${relations.length ? relations.join("; ") : "Sin relaciones directas"}</span></li>
    </ul>
  `;
}

function render() {
  renderFilters();
  renderEdges();
  renderNodes();
  renderInspector();
}

search.addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLowerCase();
  render();
});

document.getElementById("reset-view").addEventListener("click", () => {
  state.filter = "all";
  state.selected = "root";
  state.query = "";
  state.riskMode = false;
  search.value = "";
  render();
});

document.getElementById("fit-risk").addEventListener("click", () => {
  state.filter = "all";
  state.riskMode = !state.riskMode;
  state.selected = state.riskMode ? "cred-db" : "root";
  render();
});

render();
