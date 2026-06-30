const graphData = {
  areas: [
    { id: "all", label: "Todo", color: "#35c2a6" },
    { id: "site", label: "Sitio", color: "#7aa2ff" },
    { id: "credental", label: "Credental", color: "#32c6b3" },
    { id: "onstock", label: "OnStock", color: "#f0a64a" },
    { id: "design", label: "Design system", color: "#d784ff" },
    { id: "docs", label: "Docs y skills", color: "#8bd071" },
    { id: "risk", label: "Riesgos", color: "#ff7c8a" },
  ],
  nodes: [
    { id: "root", area: "all", label: "ONDIGITAL", kind: "Repo", x: 590, y: 96, size: 68, subtitle: "multi-producto", detail: "Raiz del repositorio: sitio institucional, productos Micro-Empresa, prototipos, docs, skills y configuracion." },
    { id: "site", area: "site", label: "Pagina Web", kind: "Landing", x: 170, y: 205, size: 48, subtitle: "institucional", detail: "Sitio principal de ONDIGITAL en Pagina_Web_Original/ con propuesta de servicios, equipo y contacto." },
    { id: "credental", area: "credental", label: "Credental", kind: "Producto", x: 410, y: 215, size: 58, subtitle: "clinica dental", detail: "Prototipo HTML/CSS/JS para gestion clinica dental en Honduras. Demo-grade en auth y almacenamiento." },
    { id: "onstock", area: "onstock", label: "OnStock", kind: "Producto", x: 760, y: 215, size: 58, subtitle: "mini ERP", detail: "Go 1.22+, SQLite y UI vanilla embebida para POS, inventario, compras, ventas y reportes." },
    { id: "design", area: "design", label: "Design System", kind: "Soporte", x: 1010, y: 205, size: 48, subtitle: "tokens UI", detail: "Tokens, componentes y guias visuales compartidas para interfaces ONDIGITAL." },
    { id: "docs", area: "docs", label: "Docs", kind: "Conocimiento", x: 255, y: 470, size: 46, subtitle: "arquitectura", detail: "Documentacion funcional y tecnica: arquitectura, roadmap, colaboracion y Graphify." },
    { id: "skills", area: "docs", label: "Skills", kind: "Agentes", x: 505, y: 520, size: 44, subtitle: "instrucciones", detail: "Guias internas para productos, UI, datos, seguridad, QA, Flutter y backend." },
    { id: "firebase", area: "risk", label: "Firebase", kind: "Persistencia opcional", x: 950, y: 480, size: 44, subtitle: "rules/indexes", detail: "Config de Firestore. Requiere validacion con emulator o dry-run antes de cambios reales." },
    { id: "graphify", area: "docs", label: "Graphify", kind: "Mapa repo", x: 610, y: 650, size: 46, subtitle: "graphify-out", detail: "Artefactos generados: graph.html, GRAPH_TREE.html, GRAPH_REPORT.md y graph.json." },

    { id: "cred-html", area: "credental", label: "*.html", kind: "Entrypoints", x: 240, y: 335, size: 34, subtitle: "pantallas", detail: "Pantallas por modulo que cargan db.js, auth.js, main.js y el JS del modulo." },
    { id: "cred-css", area: "credental", label: "CSS parciales", kind: "Sistema visual", x: 395, y: 365, size: 36, subtitle: "styles.css", detail: "Manifest CSS dividido en base, layout, components, modules y themes." },
    { id: "cred-main", area: "credental", label: "main.js", kind: "Shell UI", x: 535, y: 335, size: 36, subtitle: "nav + tema", detail: "Navegacion central, tema, helpers, branding multiempresa y formato HNL." },
    { id: "cred-db", area: "risk", label: "db.js", kind: "Datos demo", x: 430, y: 445, size: 42, subtitle: "sessionStorage", detail: "API repositorio consumida por toda la app. Hoy usa sessionStorage/localStorage y sync opcional." },
    { id: "cred-auth", area: "risk", label: "auth.js", kind: "Auth demo", x: 575, y: 440, size: 34, subtitle: "roles UI", detail: "Login y guardas de ruta de demostracion. No es frontera de seguridad productiva." },

    { id: "go-main", area: "onstock", label: "main.go", kind: "Servidor", x: 690, y: 340, size: 34, subtitle: "HTTP embed", detail: "Arranca servidor local, rutas HTTP y UI embebida." },
    { id: "httpapi", area: "onstock", label: "httpapi", kind: "API REST", x: 815, y: 350, size: 40, subtitle: "handlers", detail: "Endpoints para ventas, compras, productos, reportes, exports y codigos de barra." },
    { id: "store", area: "onstock", label: "store", kind: "Negocio", x: 785, y: 470, size: 42, subtitle: "SQLite", detail: "Persistencia SQLite y reglas de inventario, costo promedio, reversos y reportes." },
    { id: "on-web", area: "onstock", label: "web SPA", kind: "Frontend", x: 645, y: 455, size: 38, subtitle: "vanilla JS", detail: "UI embebida con api.js, paginas, charts, theme y componentes." },
  ],
  edges: [
    ["root", "site", "contiene"], ["root", "credental", "contiene"], ["root", "onstock", "contiene"], ["root", "design", "contiene"],
    ["root", "docs", "documenta"], ["root", "skills", "guia"], ["root", "firebase", "configura"], ["root", "graphify", "mapea"],
    ["credental", "cred-html", "renderiza"], ["credental", "cred-css", "estiliza"], ["credental", "cred-main", "coordina"],
    ["cred-html", "cred-db", "consume"], ["cred-main", "cred-auth", "protege"], ["cred-db", "firebase", "sync opcional"],
    ["onstock", "go-main", "arranca"], ["go-main", "httpapi", "sirve"], ["httpapi", "store", "muta"], ["onstock", "on-web", "embebe"],
    ["on-web", "httpapi", "consume"], ["store", "firebase", "sin dependencia"],
    ["docs", "graphify", "define"], ["skills", "graphify", "obliga"], ["design", "graphify", "visualiza"],
    ["cred-auth", "cred-db", "riesgo"], ["store", "httpapi", "verificar"], ["firebase", "cred-db", "riesgo"],
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
  return graphData.areas.find((item) => item.id === area)?.color || "#35c2a6";
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
