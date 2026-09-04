"use strict";
/* Visor 3D de grafos graphify. WebGL2 a mano: puntos y lineas con blending
   aditivo. Sin dependencias, sin red. */
(function () {
  const N = GRAPH.nodes, E = GRAPH.edges, META = GRAPH.meta;
  const PAL = CFG.palette, TH = PAL.theme;
  const COUNT = N.label.length, ECOUNT = E.s.length;
  const $ = (s) => document.querySelector(s);
  const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- color ---------- */
  const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const SEL = hex2rgb(PAL.select), FALLBACK = hex2rgb("#8A93A6");
  // Cada comunidad trae su color desde Python; no hay tope de hues.
  const COMCOL = new Map(GRAPH.communities.map((c) => [c.id, hex2rgb(c.color)]));
  const LAYCOL = (GRAPH.layerColors || []).map(hex2rgb);
  const SEQ = PAL.seq.map(hex2rgb), EDGE = hex2rgb(TH.edge);

  /* ---------- derivadas ---------- */
  const maxDeg = Math.max(1, ...N.deg);
  const rawMaxDep = Math.max(0, ...N.dep);
  const UNREACH = rawMaxDep + 1;
  const dep = N.dep.map((d) => (d < 0 ? UNREACH : d));
  const maxDep = Math.max(1, ...dep);
  const godSet = new Set(GRAPH.god);

  const commOf = new Map(GRAPH.communities.map((c) => [c.id, c]));
  const layerCount = new Map();
  N.lay.forEach((l) => layerCount.set(l, (layerCount.get(l) || 0) + 1));
  const layerRank = [...layerCount.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);

  const adj = Array.from({ length: COUNT }, () => []);
  for (let i = 0; i < ECOUNT; i++) { adj[E.s[i]].push(i); adj[E.t[i]].push(i); }

  /* ---------- posiciones por vista ---------- */
  const fib = (n, i) => {
    const y = 1 - (2 * i + 1) / Math.max(1, n);
    const r = Math.sqrt(Math.max(0, 1 - y * y)), th = Math.PI * (3 - Math.sqrt(5)) * i;
    return [Math.cos(th) * r, y, Math.sin(th) * r];
  };
  const base = Float32Array.from(N.pos);
  // cmp[i] agrupa nodos por componente conexa; 0 es siempre la gigante. Las
  // demas son satelites sueltos que 'neural' siembra lejos del nucleo (ver
  // graphify3d.py) — no deben contar para el radio de referencia de las
  // otras vistas o cualquier componente suelta grande las infla y las hace
  // ver artificialmente encogidas/con zoom.
  const CMP = N.cmp || N.com.map(() => 0);
  const isCore = (i) => CMP[i] === 0;

  const baseMeanR = (function () {
    let m = 0, cnt = 0;
    for (let i = 0; i < COUNT; i++) {
      if (!isCore(i)) continue;
      m += Math.hypot(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
      cnt++;
    }
    return (m / (cnt || COUNT)) || 1;
  })();

  // Todas las vistas se normalizan al mismo radio que 'neural' (p97 = 1), asi
  // la camara encuadra igual al morfear y ninguna se sale del encuadre.
  function normalizeView(out) {
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < COUNT; i++) { cx += out[i * 3]; cy += out[i * 3 + 1]; cz += out[i * 3 + 2]; }
    cx /= COUNT; cy /= COUNT; cz /= COUNT;
    const r = new Float64Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      out[i * 3] -= cx; out[i * 3 + 1] -= cy; out[i * 3 + 2] -= cz;
      r[i] = Math.hypot(out[i * 3], out[i * 3 + 1], out[i * 3 + 2]);
    }
    // Se iguala el radio MEDIO al de 'neural', no el percentil 97: el percentil
    // lo fija un punado de nodos lejanos y deja vistas con masa aparente distinta.
    let mean = 0;
    for (let i = 0; i < COUNT; i++) mean += r[i];
    mean = mean / COUNT || 1;
    const s = baseMeanR / mean;
    for (let i = 0; i < out.length; i++) out[i] *= s;
    return out;
  }

  function viewGalaxia() {
    const cen = new Map(), cnt = new Map();
    for (let i = 0; i < COUNT; i++) {
      const c = N.com[i], p = cen.get(c) || [0, 0, 0];
      p[0] += base[i * 3]; p[1] += base[i * 3 + 1]; p[2] += base[i * 3 + 2];
      cen.set(c, p); cnt.set(c, (cnt.get(c) || 0) + 1);
    }
    cen.forEach((p, c) => { const k = cnt.get(c); p[0] /= k; p[1] /= k; p[2] /= k; });
    const order = GRAPH.communities.map((c) => c.id);
    const seat = new Map();
    order.forEach((c, i) => {
      const d = fib(order.length, i);
      // El radio se decorrelaciona del tamano (order viene ordenado por tamano):
      // si no, la comunidad mayor cae en el centro y satura el nucleo.
      const r = 1.5 * Math.cbrt(((i * 71) % order.length + 0.5) / order.length);
      seat.set(c, [d[0] * r, d[1] * r, d[2] * r]);
    });
    // Cada lobulo se reescala a un radio propio segun su tamano. Multiplicar el
    // offset crudo por una constante deja las comunidades grandes como bolas
    // saturadas, porque el layout por fuerzas ya las deja muy compactas.
    let maxCnt = 1, spread = new Map();
    cnt.forEach(function (k) { if (k > maxCnt) maxCnt = k; });
    for (let i = 0; i < COUNT; i++) {
      const c = N.com[i], m = cen.get(c);
      const d = Math.hypot(base[i * 3] - m[0], base[i * 3 + 1] - m[1], base[i * 3 + 2] - m[2]);
      if (d > (spread.get(c) || 0)) spread.set(c, d);
    }
    const fac = new Map();
    cnt.forEach(function (k, c) {
      const target = 0.07 + 0.50 * Math.cbrt(k / maxCnt);
      fac.set(c, target / Math.max(spread.get(c) || 0, 1e-3));
    });
    const out = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const c = N.com[i], s = seat.get(c), m = cen.get(c), f = fac.get(c);
      for (let k = 0; k < 3; k++) out[i * 3 + k] = s[k] + (base[i * 3 + k] - m[k]) * f;
    }
    return normalizeView(out);
  }

  function viewOrbital() {
    const shells = new Map();
    for (let i = 0; i < COUNT; i++) {
      if (!shells.has(dep[i])) shells.set(dep[i], []);
      shells.get(dep[i]).push(i);
    }
    const out = new Float32Array(COUNT * 3);
    [...shells.keys()].sort((a, b) => a - b).forEach((d) => {
      const ids = shells.get(d).sort((a, b) => (N.com[a] - N.com[b]) || (N.deg[b] - N.deg[a]));
      const r = d === 0 ? 0.12 : 0.42 + 1.9 * Math.pow(d / maxDep, 0.78);
      ids.forEach((id, i) => {
        const u = fib(ids.length, i);
        out[id * 3] = u[0] * r; out[id * 3 + 1] = u[1] * r; out[id * 3 + 2] = u[2] * r;
      });
    });
    return normalizeView(out);
  }

  function viewEstratos() {
    const out = new Float32Array(COUNT * 3);
    const pos = new Map(layerRank.map((l, i) => [l, i]));
    const span = Math.max(1, layerRank.length - 1);
    for (let i = 0; i < COUNT; i++) {
      const li = pos.get(N.lay[i]);
      out[i * 3] = base[i * 3] * 0.85;
      out[i * 3 + 1] = (li / span - 0.5) * 2.6;
      out[i * 3 + 2] = base[i * 3 + 2] * 0.85;
    }
    return normalizeView(out);
  }

  function viewEsfera() {
    const order = [...Array(COUNT).keys()].sort((a, b) =>
      (N.com[a] - N.com[b]) || (N.deg[b] - N.deg[a]));
    const out = new Float32Array(COUNT * 3);
    order.forEach((id, i) => {
      const u = fib(COUNT, i);
      out[id * 3] = u[0] * 1.75; out[id * 3 + 1] = u[1] * 1.75; out[id * 3 + 2] = u[2] * 1.75;
    });
    return normalizeView(out);
  }

  /* ---------- utilidades para las vistas nuevas ---------- */
  // Vecinos por id de nodo (no por indice de arista): BFS propio, sin
  // depender de la profundidad multi-fuente que ya trae N.dep.
  const nbrs = Array.from({ length: COUNT }, () => []);
  for (let i = 0; i < ECOUNT; i++) { nbrs[E.s[i]].push(E.t[i]); nbrs[E.t[i]].push(E.s[i]); }

  function bfsFrom(sources) {
    const d = new Int32Array(COUNT).fill(-1);
    const q = [];
    sources.forEach((s) => { if (d[s] === -1) { d[s] = 0; q.push(s); } });
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      for (const nx of nbrs[cur]) if (d[nx] === -1) { d[nx] = d[cur] + 1; q.push(nx); }
    }
    return d;
  }

  // BFS multi-fuente que ademas recuerda cual fuente llego primero a cada
  // nodo (su "dueno"). Los nodos nunca alcanzados (componentes sueltas,
  // fuera de la gigante) quedan con owner -1.
  function bfsOwners(sources) {
    const d = new Int32Array(COUNT).fill(-1);
    const owner = new Int32Array(COUNT).fill(-1);
    const q = [];
    sources.forEach((s, si) => { if (d[s] === -1) { d[s] = 0; owner[s] = si; q.push(s); } });
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      for (const nx of nbrs[cur]) if (d[nx] === -1) { d[nx] = d[cur] + 1; owner[nx] = owner[cur]; q.push(nx); }
    }
    return { d, owner };
  }

  // Angulo aureo: separa sectores consecutivos sin que dos comunidades
  // cercanas en id caigan en angulos vecinos (mismo truco que la paleta).
  const GOLDEN_ANGLE = 2.399963229728653;

  // Hash determinista [0,1) por entero: mismo layout en cada carga, sin
  // depender de Math.random. Constantes clasicas de hash de una pasada.
  function hash01(i) {
    const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453123;
    return x - Math.floor(x);
  }

  // Ruido de valor barato (3 senos cruzados): sin octavas, solo para
  // deshilachar 'nebulosa' sin meter una libreria de ruido.
  function noise3(x, y, z) {
    return (Math.sin(x * 3.7 + y * 1.3 - z * 2.1) +
            Math.sin(y * 4.1 - z * 2.7 + x * 0.9) +
            Math.sin(z * 3.3 + x * 2.5 + y * 1.7)) / 3;
  }

  function viewNebulosa() {
    // Parte de 'neural' y la deshilacha con ruido: el nucleo (muy conectado)
    // casi no se mueve, y las hojas sueltas se difuminan como niebla — mas
    // turbulencia cuanto mas lejos del centro, para que el borde se vea
    // vaporoso en vez de recortado.
    const out = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
      const r = Math.hypot(bx, by, bz);
      const amp = 0.09 + 0.40 * Math.min(1, r / 1.35);
      const anchor = 1 / (1 + N.deg[i] * 0.06);
      const nx = noise3(bx * 2.3, by * 2.3 + 11.1, bz * 2.3 - 7.7);
      const ny = noise3(bx * 2.3 + 5.5, by * 2.3, bz * 2.3 + 3.3);
      const nz = noise3(bx * 2.3 - 3.1, by * 2.3 + 9.9, bz * 2.3);
      out[i * 3] = bx + nx * amp * anchor;
      out[i * 3 + 1] = by + ny * amp * anchor;
      out[i * 3 + 2] = bz + nz * amp * anchor;
    }
    return normalizeView(out);
  }

  function viewSolar() {
    // Un solo sol (el nodo con mas relaciones de todos). Orbitas concentricas
    // aplanadas en disco; cada comunidad ocupa su propio sector angular, como
    // familias de asteroides que comparten resonancia orbital. Lo que el sol
    // no alcanza por BFS (fuera de la componente gigante) cae en el borde,
    // como objetos interestelares.
    const sun = GRAPH.god[0] ?? 0;
    const dSun = bfsFrom([sun]);
    let maxRing = 1;
    for (let i = 0; i < COUNT; i++) if (dSun[i] > maxRing) maxRing = dSun[i];
    const outerRing = maxRing + 1;
    const out = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      if (i === sun) { out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = 0; continue; }
      const ring = dSun[i] === -1 ? outerRing : dSun[i];
      const r = 0.20 + 1.70 * Math.pow(ring / outerRing, 0.72);
      const sector = (N.com[i] * GOLDEN_ANGLE) % (Math.PI * 2);
      const ang = sector + (hash01(i * 3 + 1) - 0.5) * 1.05;
      const rj = r * (1 + (hash01(i * 7 + 3) - 0.5) * 0.14);
      const incl = (hash01(i * 11 + 5) - 0.5) * 0.34;
      out[i * 3] = Math.cos(ang) * rj;
      out[i * 3 + 1] = incl * rj;
      out[i * 3 + 2] = Math.sin(ang) * rj;
    }
    return normalizeView(out);
  }

  function viewQuasar() {
    // Nucleo compacto (los god nodes, casi pegados al origen) que se abre en
    // dos chorros opuestos. Cada comunidad se va entera a un solo lado (no se
    // reparte) para que el chorro lea como abanicos de color, no ruido.
    const core = new Set(GRAPH.god.slice(0, Math.min(3, GRAPH.god.length)));
    const dCore = bfsFrom([...core]);
    let maxT = 1;
    for (let i = 0; i < COUNT; i++) if (dCore[i] > maxT) maxT = dCore[i];
    const outerT = maxT + 1;
    const commSide = new Map();
    const out = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      if (core.has(i)) {
        const ang = hash01(i * 13) * Math.PI * 2, rr = 0.02 * hash01(i * 17 + 2);
        out[i * 3] = Math.cos(ang) * rr; out[i * 3 + 1] = Math.sin(ang * 1.7) * rr; out[i * 3 + 2] = Math.sin(ang) * rr;
        continue;
      }
      const c = N.com[i];
      if (!commSide.has(c)) commSide.set(c, hash01(c * 7.13 + 1) < 0.5 ? -1 : 1);
      const side = commSide.get(c);
      const t = (dCore[i] === -1 ? outerT : dCore[i]) / outerT;
      const z = side * (0.10 + 1.95 * Math.pow(t, 0.82));
      const spread = 0.03 + 1.30 * Math.pow(t, 1.35);
      const sector = (c * GOLDEN_ANGLE) % (Math.PI * 2);
      const ang = sector + (hash01(i * 5 + 9) - 0.5) * 0.9;
      out[i * 3] = Math.cos(ang) * spread;
      out[i * 3 + 1] = Math.sin(ang) * spread;
      out[i * 3 + 2] = z;
    }
    return normalizeView(out);
  }

  function viewAnillos() {
    // Varios centros (los god nodes) bien separados en el espacio, cada uno
    // con sus propios anillos concentricos de vecinos por BFS. Las aristas
    // reales que cruzan de un centro a otro son las 'conexiones largas' entre
    // formaciones — no hace falta dibujarlas aparte, ya estan en el grafo.
    const K = Math.min(GRAPH.god.length, 12);
    const centers = GRAPH.god.slice(0, K);
    const { d: distO, owner } = bfsOwners(centers);
    const anchors = [];
    for (let k = 0; k < K; k++) {
      const u = fib(K, k);
      anchors.push([u[0] * 1.85, u[1] * 1.85, u[2] * 1.85]);
    }
    const out = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      if (owner[i] === -1) {
        // Fuera de toda componente alcanzada por los centros: son las
        // mismas componentes sueltas que 'neural' ya siembra lejos del
        // nucleo: se reutiliza esa posicion en vez de inventar una nueva.
        out[i * 3] = base[i * 3]; out[i * 3 + 1] = base[i * 3 + 1]; out[i * 3 + 2] = base[i * 3 + 2];
        continue;
      }
      const a = anchors[owner[i]];
      if (distO[i] === 0) { out[i * 3] = a[0]; out[i * 3 + 1] = a[1]; out[i * 3 + 2] = a[2]; continue; }
      const ringR = 0.16 + 0.22 * distO[i];
      const ang = hash01(i * 5 + distO[i] * 31) * Math.PI * 2;
      const thick = (hash01(i * 9 + 2) - 0.5) * 0.05;
      out[i * 3] = a[0] + Math.cos(ang) * ringR;
      out[i * 3 + 1] = a[1] + thick;
      out[i * 3 + 2] = a[2] + Math.sin(ang) * ringR;
    }
    return normalizeView(out);
  }

  const VIEWS = [
    { key: "neural", name: "Red neuronal", desc: "Disposicion por fuerzas: la forma la dicta la conectividad real.", pos: base },
    { key: "galaxia", name: "Galaxia", desc: "Cada comunidad se separa en su propio lobulo.", pos: viewGalaxia() },
    { key: "orbital", name: "Orbital", desc: "Capas concentricas por distancia a los nodos dios.", pos: viewOrbital() },
    { key: "estratos", name: "Estratos", desc: "Planos apilados por carpeta raiz del repositorio.", pos: viewEstratos() },
    { key: "esfera", name: "Esfera", desc: "Todo en la superficie; las aristas cruzan por dentro.", pos: viewEsfera() },
    { key: "nebulosa", name: "Nebulosa", desc: "La red se deshilacha en niebla: el nucleo aguanta, las hojas se difuminan.", pos: viewNebulosa() },
    { key: "solar", name: "Sistema solar", desc: "Un sol central y orbitas concentricas en disco, por comunidad.", pos: viewSolar() },
    { key: "quasar", name: "Quasar", desc: "Nucleo compacto que se despliega en dos chorros opuestos por comunidad.", pos: viewQuasar() },
    { key: "anillos", name: "Anillos", desc: "Varios centros con sus propios anillos, unidos por conexiones largas.", pos: viewAnillos() },
  ];

  /* ---------- nacimiento (animacion de crecimiento) ---------- */
  const birth = new Float32Array(COUNT);
  {
    const order = [...Array(COUNT).keys()].sort((a, b) => (dep[a] - dep[b]) || (N.deg[b] - N.deg[a]));
    order.forEach((id, i) => { birth[id] = (i / Math.max(1, COUNT - 1)) * 0.88; });
  }

  /* ---------- WebGL ---------- */
  const canvas = $("#stage");
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, preserveDrawingBuffer: true });
  if (!gl) {
    const box = $("#gl-error");
    box.hidden = false;
    box.textContent = "Este navegador no expone WebGL2, que es lo que dibuja la red. " +
      "Los mismos datos estan en graph.json y en GRAPH_REPORT.md.";
    $("#ui").hidden = true;
    return;
  }

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };

  const NODE_VS = `#version 300 es
precision highp float;
in vec3 aPosA; in vec3 aPosB; in vec3 aColor; in vec3 aDrift;
in float aSize; in float aBirth; in float aState;
uniform mat4 uView, uProj;
uniform float uMorph, uGrow, uTime, uPixel, uFogNear, uFogFar, uDim, uBreath;
out vec3 vColor; out float vAlpha; out float vHot;
void main() {
  if (aState < -1.5) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); gl_PointSize = 0.0; vAlpha = 0.0; vHot = 0.0; vColor = aColor; return; }
  vec3 p = mix(aPosA, aPosB, uMorph);
  p += aDrift * uBreath * sin(uTime * 0.55 + aBirth * 37.0);
  vec4 mv = uView * vec4(p, 1.0);
  gl_Position = uProj * mv;
  float d = max(-mv.z, 0.05);
  float born = smoothstep(aBirth, aBirth + 0.11, uGrow);
  float fog = 1.0 - smoothstep(uFogNear, uFogFar, d);
  float hot = max(aState, 0.0);
  gl_PointSize = clamp(aSize * (1.0 + hot * 0.85) * uPixel / d, 2.4, 90.0);
  vAlpha = born * (0.50 + 0.50 * fog) * (aState < -0.5 ? uDim : 1.0) * (0.78 + 0.62 * hot);
  vColor = mix(aColor, vec3(1.0), hot * 0.30);
  vHot = hot;
}`;

  const NODE_FS = `#version 300 es
precision highp float;
in vec3 vColor; in float vAlpha; in float vHot;
out vec4 frag;
void main() {
  float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
  if (d > 1.0) discard;
  float glow = pow(1.0 - d, 1.9);
  float core = smoothstep(0.70, 0.0, d);
  vec3 c = vColor * (0.95 + 0.35 * core) + vec3(core * 0.75 * vHot);
  frag = vec4(c * vAlpha * (glow * 1.35 + core * 1.30), 1.0);
}`;

  const EDGE_VS = `#version 300 es
precision highp float;
in vec3 aPosA; in vec3 aPosB; in vec3 aColor;
in float aT; in float aConf; in float aSeed; in float aBirth; in float aState;
uniform mat4 uView, uProj;
uniform float uMorph, uGrow, uFogNear, uFogFar, uDim;
out vec3 vColor; out float vAlpha; out float vT; out float vConf; out float vSeed; out float vHot;
void main() {
  if (aState < -1.5) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vAlpha = 0.0; vColor = aColor; vT = 0.0; vConf = aConf; vSeed = aSeed; vHot = 0.0; return; }
  vec3 p = mix(aPosA, aPosB, uMorph);
  vec4 mv = uView * vec4(p, 1.0);
  gl_Position = uProj * mv;
  float d = max(-mv.z, 0.05);
  float born = smoothstep(aBirth, aBirth + 0.11, uGrow);
  float fog = 1.0 - smoothstep(uFogNear, uFogFar, d);
  vHot = max(aState, 0.0);
  vAlpha = born * (0.34 + 0.50 * fog) * (aState < -0.5 ? uDim * 0.5 : 1.0);
  vColor = aColor; vT = aT; vConf = aConf; vSeed = aSeed;
}`;

  const EDGE_FS = `#version 300 es
precision highp float;
in vec3 vColor; in float vAlpha; in float vT; in float vConf; in float vSeed; in float vHot;
uniform float uTime, uPulse;
out vec4 frag;
void main() {
  // Las relaciones inferidas van punteadas: la confianza no se comunica solo con color.
  if (vConf > 0.5 && fract(vT * 24.0) > 0.45) discard;
  float base = vConf > 0.5 ? 0.34 : 0.60;
  float sig = 0.0;
  if (uPulse > 0.5) {
    float w = fract(vT * 0.85 - uTime * 0.20 + vSeed);
    sig = smoothstep(0.90, 1.0, w) * (0.55 + vHot);
  }
  vec3 c = vColor * (base + sig * 1.7 + vHot * 0.9);
  frag = vec4(c * vAlpha, 1.0);
}`;

  const nodeProg = program(NODE_VS, NODE_FS);
  const edgeProg = program(EDGE_VS, EDGE_FS);
  const U = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
  const nu = U(nodeProg, ["uView", "uProj", "uMorph", "uGrow", "uTime", "uPixel", "uFogNear", "uFogFar", "uDim", "uBreath"]);
  const eu = U(edgeProg, ["uView", "uProj", "uMorph", "uGrow", "uFogNear", "uFogFar", "uDim", "uTime", "uPulse"]);

  const buf = (data, usage) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
    return b;
  };
  const attrib = (prog, name, b, size) => {
    const loc = gl.getAttribLocation(prog, name);
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };

  /* --- datos de nodo --- */
  const nPosA = new Float32Array(base), nPosB = new Float32Array(base);
  const nColor = new Float32Array(COUNT * 3);
  const nSize = new Float32Array(COUNT);
  const nState = new Float32Array(COUNT);
  const nDrift = new Float32Array(COUNT * 3);
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < COUNT; i++) {
    nSize[i] = (2.4 + 8.2 * Math.pow(N.deg[i] / maxDeg, 0.55)) * (godSet.has(i) ? 1.5 : 1);
    const v = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1];
    const m = Math.hypot(...v) || 1;
    for (let k = 0; k < 3; k++) nDrift[i * 3 + k] = v[k] / m;
  }
  const bPosA = buf(nPosA, gl.DYNAMIC_DRAW), bPosB = buf(nPosB, gl.DYNAMIC_DRAW);
  const bColor = buf(nColor, gl.DYNAMIC_DRAW), bSize = buf(nSize);
  const bBirth = buf(birth), bState = buf(nState, gl.DYNAMIC_DRAW), bDrift = buf(nDrift);
  const nodeVao = gl.createVertexArray();
  gl.bindVertexArray(nodeVao);
  attrib(nodeProg, "aPosA", bPosA, 3); attrib(nodeProg, "aPosB", bPosB, 3);
  attrib(nodeProg, "aColor", bColor, 3); attrib(nodeProg, "aDrift", bDrift, 3);
  attrib(nodeProg, "aSize", bSize, 1); attrib(nodeProg, "aBirth", bBirth, 1);
  attrib(nodeProg, "aState", bState, 1);
  gl.bindVertexArray(null);

  /* --- datos de arista (2 vertices por arista) --- */
  const V = ECOUNT * 2;
  const ePosA = new Float32Array(V * 3), ePosB = new Float32Array(V * 3);
  const eColor = new Float32Array(V * 3), eT = new Float32Array(V);
  const eConf = new Float32Array(V), eSeed = new Float32Array(V);
  const eBirth = new Float32Array(V), eState = new Float32Array(V);
  for (let i = 0; i < ECOUNT; i++) {
    const s = E.s[i], t = E.t[i], b = Math.max(birth[s], birth[t]), ph = rnd();
    [[s, 0], [t, 1]].forEach(([nid, k]) => {
      const v = i * 2 + k;
      for (let a = 0; a < 3; a++) { ePosA[v * 3 + a] = base[nid * 3 + a]; ePosB[v * 3 + a] = base[nid * 3 + a]; }
      eT[v] = k; eConf[v] = E.c[i]; eSeed[v] = ph; eBirth[v] = b;
      eColor[v * 3] = EDGE[0]; eColor[v * 3 + 1] = EDGE[1]; eColor[v * 3 + 2] = EDGE[2];
    });
  }
  const ebPosA = buf(ePosA, gl.DYNAMIC_DRAW), ebPosB = buf(ePosB, gl.DYNAMIC_DRAW);
  const ebColor = buf(eColor, gl.DYNAMIC_DRAW), ebT = buf(eT), ebConf = buf(eConf);
  const ebSeed = buf(eSeed), ebBirth = buf(eBirth), ebState = buf(eState, gl.DYNAMIC_DRAW);
  const edgeVao = gl.createVertexArray();
  gl.bindVertexArray(edgeVao);
  attrib(edgeProg, "aPosA", ebPosA, 3); attrib(edgeProg, "aPosB", ebPosB, 3);
  attrib(edgeProg, "aColor", ebColor, 3); attrib(edgeProg, "aT", ebT, 1);
  attrib(edgeProg, "aConf", ebConf, 1); attrib(edgeProg, "aSeed", ebSeed, 1);
  attrib(edgeProg, "aBirth", ebBirth, 1); attrib(edgeProg, "aState", ebState, 1);
  gl.bindVertexArray(null);

  const upload = (b, data) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data); };

  /* ---------- matrices ---------- */
  const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  };
  const perspective = (fov, aspect, near, far) => {
    const f = 1 / Math.tan(fov / 2), o = new Float32Array(16);
    o[0] = f / aspect; o[5] = f; o[10] = (far + near) / (near - far);
    o[11] = -1; o[14] = (2 * far * near) / (near - far);
    return o;
  };
  const lookAt = (eye, ctr, up) => {
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const nrm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const z = nrm(sub(eye, ctr)), x = nrm(crs(up, z)), y = crs(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
      -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
      -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]), 1,
    ]);
  };

  /* ---------- camara ---------- */
  const cam = { theta: 0.7, phi: 1.15, dist: 3.2, target: [0, 0, 0], tTheta: 0.7, tPhi: 1.15, tDist: 3.2, tTarget: [0, 0, 0] };
  let spin = !REDUCED, view = new Float32Array(16), proj = new Float32Array(16), eye = [0, 0, 5];

  function updateCamera(dt) {
    if (spin && !dragging) cam.tTheta += dt * 0.055;
    const k = 1 - Math.pow(0.002, dt);
    cam.theta += (cam.tTheta - cam.theta) * k;
    cam.phi += (cam.tPhi - cam.phi) * k;
    cam.dist += (cam.tDist - cam.dist) * k;
    for (let i = 0; i < 3; i++) cam.target[i] += (cam.tTarget[i] - cam.target[i]) * k;
    const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
    eye = [
      cam.target[0] + cam.dist * sp * Math.sin(cam.theta),
      cam.target[1] + cam.dist * cp,
      cam.target[2] + cam.dist * sp * Math.cos(cam.theta),
    ];
    view = lookAt(eye, cam.target, [0, 1, 0]);
    proj = perspective(0.85, canvas.width / canvas.height, 0.05, 60);
  }

  /* ---------- estado de vista/color/filtros ---------- */
  const state = {
    view: Math.max(0, VIEWS.findIndex((v) => v.key === CFG.view)),
    colorMode: "comunidad", morph: 1, grow: 0, time: 0,
    minDeg: 0, extracted: true, inferred: true, pulse: !REDUCED, labels: true,
    focus: -1, level: 0, isolate: null, pick: null, pickKey: null, query: "",
  };
  const cur = new Float32Array(base);

  const COLOR_MODES = [
    { key: "comunidad", name: "Comunidad" },
    { key: "capa", name: "Carpeta raiz" },
    { key: "profundidad", name: "Profundidad" },
    { key: "grado", name: "Grado" },
  ];

  function colorOf(i) {
    switch (state.colorMode) {
      case "comunidad": return COMCOL.get(N.com[i]) || FALLBACK;
      case "capa": return LAYCOL[N.lay[i]] || FALLBACK;
      case "profundidad": return SEQ[Math.min(SEQ.length - 1, Math.round(dep[i] / maxDep * (SEQ.length - 1)))];
      default: return SEQ[Math.min(SEQ.length - 1, Math.round((1 - Math.pow(N.deg[i] / maxDeg, 0.45)) * (SEQ.length - 1)))];
    }
  }

  function recolor() {
    for (let i = 0; i < COUNT; i++) {
      const c = colorOf(i);
      nColor[i * 3] = c[0]; nColor[i * 3 + 1] = c[1]; nColor[i * 3 + 2] = c[2];
    }
    upload(bColor, nColor);
  }

  const matches = (i) => {
    if (!state.query) return true;
    const q = state.query;
    return N.label[i].toLowerCase().includes(q)
      || GRAPH.files[N.file[i]].toLowerCase().includes(q)
      || (commOf.get(N.com[i]) || { name: "" }).name.toLowerCase().includes(q);
  };

  let visibleNodes = 0, visibleEdges = 0, litNodes = 0, litEdges = 0;

  // Niveles de enfoque: cada click sobre el mismo nodo estrecha el foco.
  //   1 vecinos directos  ·  2 el vecino con mas relaciones  ·  3 solo el nodo
  let partner = -1;

  function restate() {
    const focus = state.focus;
    let near = new Set();
    partner = -1;
    if (focus >= 0) {
      near.add(focus);
      adj[focus].forEach((ei) => { near.add(E.s[ei]); near.add(E.t[ei]); });
      if (state.level >= 2) {
        let bd = -1;
        near.forEach((j) => { if (j !== focus && N.deg[j] > bd) { bd = N.deg[j]; partner = j; } });
        near = new Set(state.level >= 3 || partner < 0 ? [focus] : [focus, partner]);
      }
    }
    const hidden = new Uint8Array(COUNT);
    visibleNodes = 0; litNodes = 0;
    for (let i = 0; i < COUNT; i++) {
      let hide = N.deg[i] < state.minDeg;
      if (!hide && state.pick && !state.pick.has(i)) hide = true;
      if (!hide && state.isolate !== null && N.com[i] !== state.isolate) hide = true;
      if (hide) { hidden[i] = 1; nState[i] = -2; continue; }
      visibleNodes++;
      if (focus >= 0) nState[i] = i === focus ? 1 : (near.has(i) ? (state.level >= 2 ? 1 : 0.55) : -1);
      else if (state.query) nState[i] = matches(i) ? 1 : -1;
      else nState[i] = 0;
      if (nState[i] > -0.5) litNodes++;
    }
    upload(bState, nState);

    visibleEdges = 0; litEdges = 0;
    for (let i = 0; i < ECOUNT; i++) {
      const s = E.s[i], t = E.t[i], inf = E.c[i] === 1;
      let st;
      if (hidden[s] || hidden[t] || (inf && !state.inferred) || (!inf && !state.extracted)) st = -2;
      else if (focus >= 0) st = !(near.has(s) && near.has(t)) ? -1
        : (s === focus || t === focus) ? 1 : (state.level >= 2 ? -1 : 0);
      else if (state.query) st = (matches(s) || matches(t)) ? 0 : -1;
      else st = 0;
      if (st > -1.5) visibleEdges++;
      if (st > -0.5) litEdges++;
      const hot = st >= 1;
      for (let k = 0; k < 2; k++) {
        const v = i * 2 + k;
        eState[v] = st;
        const c = hot ? SEL : EDGE;
        eColor[v * 3] = c[0]; eColor[v * 3 + 1] = c[1]; eColor[v * 3 + 2] = c[2];
      }
    }
    upload(ebState, eState); upload(ebColor, eColor);
    renderStats();
  }

  /* ---------- cambio de vista ---------- */
  let morphFrom = null, morphT = 1;
  function setView(idx, instant) {
    const target = VIEWS[idx].pos;
    if (!instant) { morphFrom = new Float32Array(cur); morphT = 0; }
    else { morphT = 1; cur.set(target); }
    state.view = idx;
    nPosB.set(target); upload(bPosB, nPosB);
    if (instant) { nPosA.set(target); upload(bPosA, nPosA); }
    else { nPosA.set(morphFrom); upload(bPosA, nPosA); }
    for (let i = 0; i < ECOUNT; i++) {
      [[E.s[i], 0], [E.t[i], 1]].forEach(([nid, k]) => {
        const v = i * 2 + k;
        for (let a = 0; a < 3; a++) {
          ePosB[v * 3 + a] = target[nid * 3 + a];
          ePosA[v * 3 + a] = instant ? target[nid * 3 + a] : morphFrom[nid * 3 + a];
        }
      });
    }
    upload(ebPosA, ePosA); upload(ebPosB, ePosB);
    $("#subtitle").textContent = VIEWS[idx].desc;
  }

  /* ---------- interaccion ---------- */
  let dragging = false, panning = false, lastX = 0, lastY = 0, downX = 0, downY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; panning = e.shiftKey || e.button === 2;
    lastX = downX = e.clientX; lastY = downY = e.clientY;
    canvas.setPointerCapture(e.pointerId); canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointerup", (e) => {
    dragging = false; canvas.classList.remove("dragging");
    if (Math.abs(e.clientX - downX) < 4 && Math.abs(e.clientY - downY) < 4) {
      const hit = pick(e.clientX, e.clientY);
      if (hit >= 0) selectNode(hit); else deselect();
    }
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointermove", (e) => {
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (panning) {
        const s = cam.dist * 0.0016;
        const rx = [Math.cos(cam.theta), 0, -Math.sin(cam.theta)];
        cam.tTarget[0] -= (rx[0] * dx) * s; cam.tTarget[2] -= (rx[2] * dx) * s;
        cam.tTarget[1] += dy * s;
      } else {
        cam.tTheta -= dx * 0.006;
        cam.tPhi = Math.min(Math.PI - 0.08, Math.max(0.08, cam.tPhi - dy * 0.006));
      }
      lastX = e.clientX; lastY = e.clientY;
    } else { hoverX = e.clientX; hoverY = e.clientY; hoverDirty = true; }
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.tDist = Math.min(24, Math.max(0.35, cam.tDist * Math.exp(e.deltaY * 0.0011)));
  }, { passive: false });

  let hoverX = 0, hoverY = 0, hoverDirty = false, hovered = -1;
  const tooltip = $("#tooltip");

  function project(i, out) {
    const x = cur[i * 3], y = cur[i * 3 + 1], z = cur[i * 3 + 2];
    const vx = view[0] * x + view[4] * y + view[8] * z + view[12];
    const vy = view[1] * x + view[5] * y + view[9] * z + view[13];
    const vz = view[2] * x + view[6] * y + view[10] * z + view[14];
    if (vz > -0.06) return false;
    const cw = -vz;
    out[0] = (proj[0] * vx / cw * 0.5 + 0.5) * canvas.clientWidth;
    out[1] = (0.5 - proj[5] * vy / cw * 0.5) * canvas.clientHeight;
    out[2] = cw;
    return true;
  }

  const p3 = [0, 0, 0];
  function pick(px, py) {
    const r = canvas.getBoundingClientRect();
    const x = px - r.left, y = py - r.top;
    let best = -1, bestScore = Infinity;
    for (let i = 0; i < COUNT; i++) {
      if (nState[i] < -1.5) continue;
      if (!project(i, p3)) continue;
      const d = Math.hypot(p3[0] - x, p3[1] - y);
      const reach = Math.max(9, nSize[i] * 40 / p3[2]);
      if (d > reach) continue;
      const score = d - nSize[i] * 0.6;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  function showTooltip(i, px, py) {
    const c = commOf.get(N.com[i]);
    tooltip.innerHTML = "";
    const name = el("div", "t-name"); name.textContent = N.label[i]; tooltip.append(name);
    const meta = el("div", "t-meta");
    meta.textContent = [
      c ? c.name : "sin comunidad",
      N.deg[i] + " conexiones",
      GRAPH.files[N.file[i]] || "",
    ].filter(Boolean).join("  ·  ");
    tooltip.append(meta);
    tooltip.hidden = false;
    const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
    tooltip.style.left = Math.min(innerWidth - w - 10, px + 16) + "px";
    tooltip.style.top = Math.max(8, py - h - 14) + "px";
  }

  /* ---------- seleccion ---------- */
  function selectNode(i, level) {
    if (level === undefined) level = (i === state.focus) ? state.level + 1 : 1;
    if (level > 3) { deselect(); return; }
    state.level = level;
    state.focus = i;
    for (let k = 0; k < 3; k++) cam.tTarget[k] = cur[i * 3 + k];
    cam.tDist = Math.max(0.9, Math.min(cam.tDist, 2.6));
    restate(); renderInspector();
  }
  function deselect() {
    state.focus = -1; state.level = 0;
    cam.tTarget = [0, 0, 0]; cam.tDist = Math.max(cam.tDist, 4.6);
    restate(); $("#inspector").hidden = true;
  }

  function renderInspector() {
    const i = state.focus;
    if (i < 0 || !shown.has("info")) { $("#inspector").hidden = true; return; }
    const body = $("#inspector-body");
    body.innerHTML = "";
    const c = commOf.get(N.com[i]);
    const kind = el("p", "ins-kind");
    kind.textContent = (godSet.has(i) ? "Nodo dios" : "Nodo") +
      (state.level >= 3 ? " · solo este nodo"
       : state.level >= 2 ? (partner >= 0 ? " · con su mayor: " + N.label[partner] : " · sin vecinos")
       : " · con sus vecinos");
    const h = el("h2", "ins-title"); h.textContent = N.label[i];
    body.append(kind, h);

    const dl = el("dl", "ins-meta");
    const rows = [
      ["Comunidad", c ? c.name + "  (" + c.size + ")" : "—"],
      ["Conexiones", String(N.deg[i])],
      ["Profundidad", dep[i] >= UNREACH ? "aislado" : String(dep[i])],
      ["Archivo", GRAPH.files[N.file[i]] || "—"],
      ["Ubicacion", N.loc[i] || "—"],
      ["Tipo", GRAPH.types[N.typ[i]] || "—"],
      ["ID", N.id[i]],
    ];
    rows.forEach(([k, v]) => {
      const dt = el("dt"); dt.textContent = k;
      const dd = el("dd"); dd.textContent = v;
      dl.append(dt, dd);
    });
    body.append(dl);

    const seen = new Map();
    adj[i].forEach((ei) => {
      const other = E.s[ei] === i ? E.t[ei] : E.s[ei];
      if (!seen.has(other)) seen.set(other, GRAPH.relations[E.r[ei]]);
    });
    if (seen.size) {
      const sub = el("p", "ins-sub"); sub.textContent = "Vecinos (" + seen.size + ")";
      const list = el("div", "neigh");
      [...seen.entries()].sort((a, b) => N.deg[b[0]] - N.deg[a[0]]).forEach(([o, rel]) => {
        const b = el("button"); b.type = "button";
        const nm = el("span"); nm.textContent = N.label[o];
        const r = el("span", "rel"); r.textContent = rel;
        b.append(nm, r);
        b.onclick = () => selectNode(o);
        list.append(b);
      });
      body.append(sub, list);
    }
    $("#inspector").hidden = false;
  }

  /* ---------- leyenda ---------- */
  const LEGEND_TOP = 8;

  function renderLegend() {
    const body = $("#legend-body");
    body.innerHTML = "";
    if (state.colorMode === "comunidad" || state.colorMode === "capa") {
      const isComm = state.colorMode === "comunidad";
      const items = isComm
        ? GRAPH.communities.slice(0, LEGEND_TOP).map((c) => ({ id: c.id, name: c.name, size: c.size, color: c.color }))
        : layerRank.slice(0, LEGEND_TOP).map((l) => ({ id: null, name: GRAPH.layers[l], size: layerCount.get(l),
                                                       color: GRAPH.layerColors[l] }));
      items.forEach((it) => {
        const b = el(isComm ? "button" : "div", "legend-row");
        if (isComm) b.type = "button";
        const sw = el("i", "swatch"); sw.style.color = it.color;
        const nm = el("span", "name"); nm.textContent = it.name;
        const ct = el("span", "count mono"); ct.textContent = it.size;
        b.append(sw, nm, ct);
        if (isComm) {
          b.setAttribute("aria-pressed", String(state.isolate === it.id));
          b.onclick = () => {
            state.isolate = state.isolate === it.id ? null : it.id;
            deselect(); restate(); renderLegend();
          };
        }
        body.append(b);
      });
      const restN = isComm ? GRAPH.communities.length - items.length : layerRank.length - items.length;
      const restSize = isComm
        ? GRAPH.communities.slice(LEGEND_TOP).reduce((a, c) => a + c.size, 0)
        : layerRank.slice(LEGEND_TOP).reduce((a, l) => a + layerCount.get(l), 0);
      const note = el("p", "legend-note");
      note.textContent = restN > 0
        ? "Aqui van las " + items.length + " mayores. Las otras " + restN + " (" + restSize +
          " nodos) tambien llevan color propio, pero con tantos grupos el color solo no basta: "
          + "usa el click, la busqueda y los accesos de arriba para identificarlas."
        : "Click en una fila para dejar solo ese grupo encendido.";
      body.append(note);
    } else {
      const wrap = el("div");
      wrap.style.cssText = "display:flex;height:10px;border-radius:5px;overflow:hidden";
      PAL.seq.forEach((h) => { const s = el("i"); s.style.cssText = "flex:1;background:" + h; wrap.append(s); });
      const lab = el("p", "legend-note");
      lab.style.borderTop = "0"; lab.style.paddingTop = "6px";
      lab.textContent = state.colorMode === "profundidad"
        ? "Claro = cerca de un nodo dios; oscuro = periferia (" + maxDep + " saltos)."
        : "Claro = mas conectado (max " + maxDeg + "); oscuro = hoja.";
      body.append(wrap, lab);
    }
    const conf = el("p", "legend-note");
    conf.textContent = "Relaciones: linea continua = extraida del codigo. Punteada = inferida ("
      + META.inferred + " de " + META.edges + ").";
    body.append(conf);
  }

  /* ---------- HUD ---------- */
  let fps = 60;
  function renderStats() {
    // Con el foco activo lo no encendido es invisible, no atenuado: la cifra
    // que importa es lo que se ve, no lo que sigue cargado en la escena.
    const focused = litNodes < visibleNodes;
    $("#stats").innerHTML =
      "<b>" + (focused ? litNodes : visibleNodes) + "</b> / " + COUNT + " nodos<br>" +
      "<b>" + (focused ? litEdges : visibleEdges) + "</b> / " + ECOUNT + " relaciones<br>" +
      (focused ? "encendido de " + visibleNodes + " en escena"
               : META.communities + " comunidades") +
      " &middot; <b>" + Math.round(fps) + "</b> fps";
  }

  /* ---------- etiquetas ---------- */
  const labelLayer = el("div"); labelLayer.id = "labels";
  document.body.append(labelLayer);
  const labelPool = [];
  const taken = [];
  function renderLabels() {
    const cand = [];
    if (state.labels) for (const g of GRAPH.god) if (nState[g] > -0.5) cand.push(g);
    for (const id of [state.focus, hovered]) if (id >= 0 && !cand.includes(id)) cand.push(id);

    const placed = [];
    taken.length = 0;
    for (const id of cand) {
      if (!project(id, p3)) continue;
      const pinned = id === state.focus || id === hovered;
      placed.push({ id: id, x: p3[0], y: p3[1] - 7, z: p3[2], pinned: pinned });
    }
    // El nodo enfocado manda; el resto se ordena de cerca a lejos para que,
    // al descartar solapes, sobreviva siempre la etiqueta mas proxima.
    placed.sort(function (a, b) { return (b.pinned - a.pinned) || (a.z - b.z); });

    let k = 0;
    for (const it of placed) {
      const w = N.label[it.id].length * 6.3 + 12, h = 15;
      const x0 = it.x - 4, y0 = it.y - h / 2;
      let hit = false;
      if (!it.pinned) {
        for (const r of taken) {
          if (x0 < r[2] && x0 + w > r[0] && y0 < r[3] && y0 + h > r[1]) { hit = true; break; }
        }
      }
      if (hit) continue;
      taken.push([x0, y0, x0 + w, y0 + h]);
      while (labelPool.length <= k) {
        const d = el("div", "nodelabel"); labelLayer.append(d); labelPool.push(d);
      }
      const d = labelPool[k++];
      d.style.display = "";
      d.textContent = N.label[it.id];
      d.classList.toggle("is-focus", it.pinned);
      d.style.opacity = String(Math.max(0.3, Math.min(1, 2.6 / it.z)));
      d.style.transform = "translate3d(" + Math.round(it.x) + "px," + Math.round(it.y) + "px,0)";
    }
    for (let i = k; i < labelPool.length; i++) labelPool[i].style.display = "none";
  }

  /* ---------- bucle ---------- */
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  addEventListener("resize", resize);

  const bg = hex2rgb(TH.surface);
  let last = performance.now(), growing = true;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fps += ((1 / Math.max(dt, 1e-4)) - fps) * 0.06;
    state.time += dt;
    if (growing) {
      state.grow = Math.min(1, state.grow + dt / (REDUCED ? 0.4 : 3.4));
      if (state.grow >= 1) growing = false;
    }
    if (morphT < 1) {
      morphT = Math.min(1, morphT + dt / (REDUCED ? 0.2 : 1.15));
      const e = morphT < 0.5 ? 4 * morphT ** 3 : 1 - Math.pow(-2 * morphT + 2, 3) / 2;
      state.morph = e;
      const tgt = VIEWS[state.view].pos;
      for (let i = 0; i < cur.length; i++) cur[i] = morphFrom[i] + (tgt[i] - morphFrom[i]) * e;
      if (morphT >= 1) { cur.set(tgt); nPosA.set(tgt); upload(bPosA, nPosA); ePosA.set(ePosB); upload(ebPosA, ePosA); state.morph = 0; }
    }
    resize();
    updateCamera(dt);

    if (hoverDirty && !dragging) {
      hoverDirty = false;
      const h = pick(hoverX, hoverY);
      if (h !== hovered) {
        hovered = h;
        if (h >= 0 && shown.has("info")) showTooltip(h, hoverX, hoverY); else tooltip.hidden = true;
      } else if (h >= 0) showTooltip(h, hoverX, hoverY);
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    const fogNear = Math.max(0.6, cam.dist * 0.45), fogFar = cam.dist * 2.6;

    gl.useProgram(edgeProg);
    gl.bindVertexArray(edgeVao);
    gl.uniformMatrix4fv(eu.uView, false, view); gl.uniformMatrix4fv(eu.uProj, false, proj);
    gl.uniform1f(eu.uMorph, state.morph); gl.uniform1f(eu.uGrow, state.grow);
    gl.uniform1f(eu.uFogNear, fogNear); gl.uniform1f(eu.uFogFar, fogFar);
    gl.uniform1f(eu.uDim, 0.0); gl.uniform1f(eu.uTime, state.time);
    gl.uniform1f(eu.uPulse, state.pulse ? 1 : 0);
    gl.drawArrays(gl.LINES, 0, V);

    gl.useProgram(nodeProg);
    gl.bindVertexArray(nodeVao);
    gl.uniformMatrix4fv(nu.uView, false, view); gl.uniformMatrix4fv(nu.uProj, false, proj);
    gl.uniform1f(nu.uMorph, state.morph); gl.uniform1f(nu.uGrow, state.grow);
    gl.uniform1f(nu.uTime, state.time);
    gl.uniform1f(nu.uPixel, canvas.height / (2 * Math.tan(0.425)) * 0.0055);
    gl.uniform1f(nu.uFogNear, fogNear); gl.uniform1f(nu.uFogFar, fogFar);
    gl.uniform1f(nu.uDim, 0.0); gl.uniform1f(nu.uBreath, REDUCED ? 0 : 0.012);
    gl.drawArrays(gl.POINTS, 0, COUNT);
    gl.bindVertexArray(null);

    renderLabels();
    requestAnimationFrame(frame);
  }

  /* ---------- interfaz por teclado ---------- */
  // Arranca sin nada encima de la red. Cada region se enciende con su tecla;
  // el config.js puede pedir que alguna venga encendida de fabrica.
  const CHROME = [
    { id: "topbar", key: "A", name: "Accesos rapidos y titulo" },
    { id: "controls", key: "C", name: "Controles: buscar, color, filtros" },
    { id: "legend", key: "L", name: "Leyenda de comunidades" },
    { id: "stats", key: "E", name: "Estadisticas" },
    { id: "info", key: "I", name: "Datos al senalar y al seleccionar" },
  ];
  const shown = new Set(Array.isArray(CFG.chrome) ? CFG.chrome : []);

  function applyChrome() {
    CHROME.forEach((r) => {
      if (r.id === "info") return;
      $("#" + r.id).hidden = !shown.has(r.id);
    });
    if (!shown.has("info")) { tooltip.hidden = true; $("#inspector").hidden = true; }
    else renderInspector();
  }

  function toggleChrome(id) {
    if (shown.has(id)) shown.delete(id); else shown.add(id);
    applyChrome();
  }

  function toggleAllChrome() {
    if (shown.size) shown.clear();
    else CHROME.forEach((r) => shown.add(r.id));
    applyChrome();
  }

  const KEYMAP = [
    ["Interfaz", [
      ["?  /  H", "Esta ayuda"],
      ["U", "Toda la interfaz de golpe"],
    ]],
    ["Vistas", [
      ["1 - " + VIEWS.length, "Cambiar de vista (" + VIEWS.map((v) => v.name).join(", ") + ")"],
      ["Espacio", "Giro automatico"],
      ["R", "Repetir la construccion de la red"],
    ]],
    ["Datos", [
      ["/", "Buscar"],
      ["T", "Tabla de nodos"],
      ["P", "Guardar PNG"],
      ["Esc", "Limpiar seleccion y filtros"],
    ]],
    ["Raton", [
      ["arrastrar", "Orbitar"],
      ["rueda", "Acercar"],
      ["shift+arrastrar", "Mover"],
      ["click repetido", "Vecinos -> nodo mayor -> solo el nodo"],
    ]],
  ];

  function buildKeysPanel() {
    const body = $("#keys-body");
    body.innerHTML = "";
    const grid = el("div", "keys-grid");
    const section = (title, rows) => {
      const h = el("h3"); h.textContent = title; grid.append(h);
      rows.forEach(([k, txt]) => {
        const kb = el("kbd"); kb.textContent = k;
        const sp = el("span"); sp.textContent = txt;
        grid.append(kb, sp);
      });
    };
    section("Paneles", CHROME.map((r) => [r.key, r.name]));
    (GRAPH.shortcuts || []).slice(0, 9).forEach((sc, i) => {
      if (i === 0) { const h = el("h3"); h.textContent = "Accesos rapidos"; grid.append(h); }
      const kb = el("kbd"); kb.textContent = "shift+" + (i + 1);
      const sp = el("span"); sp.textContent = sc.label + (sc.note ? " — " + sc.note : "");
      grid.append(kb, sp);
    });
    KEYMAP.forEach(([t, rows]) => section(t, rows));
    body.append(grid);
  }

  function flash(msg, ms) {
    const f = $("#flash");
    f.textContent = msg;
    f.classList.add("on");
    setTimeout(() => f.classList.remove("on"), ms || 3600);
  }

  /* ---------- UI ---------- */
  function buildUI() {
    // Accesos rapidos: aislan un subconjunto de nodos de golpe.
    const jn = $("#jump");
    (GRAPH.shortcuts || []).forEach((sc) => {
      const b = el("button"); b.type = "button"; b.textContent = sc.label;
      b.title = sc.note || "";
      b.setAttribute("aria-pressed", "false");
      b.onclick = () => {
        const on = state.pickKey === sc.label;
        state.pick = on ? null : new Set(sc.ids);
        state.pickKey = on ? null : sc.label;
        state.isolate = null;
        jn.querySelectorAll("button").forEach((x) =>
          x.setAttribute("aria-pressed", String(!on && x === b)));
        if (!on && sc.focus !== undefined) selectNode(sc.focus, 1);
        else { deselect(); restate(); }
        renderLegend();
      };
      jn.append(b);
    });

    const cm = $("#colormode");
    COLOR_MODES.forEach((m) => {
      const b = el("button"); b.type = "button"; b.textContent = m.name;
      b.setAttribute("aria-pressed", String(m.key === state.colorMode));
      b.onclick = () => {
        state.colorMode = m.key;
        if (m.key !== "comunidad") state.isolate = null;
        cm.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        recolor(); renderLegend(); restate();
      };
      cm.append(b);
    });

    const deg = $("#deg");
    deg.max = String(Math.min(40, maxDeg));
    deg.oninput = () => { state.minDeg = +deg.value; $("#degval").textContent = deg.value; restate(); };

    $("#showExtracted").onchange = (e) => { state.extracted = e.target.checked; restate(); };
    $("#showInferred").onchange = (e) => { state.inferred = e.target.checked; restate(); };
    $("#showPulse").onchange = (e) => { state.pulse = e.target.checked; };
    $("#showPulse").checked = state.pulse;
    $("#showLabels").onchange = (e) => { state.labels = e.target.checked; };

    const search = $("#search"), hits = $("#search-hits");
    search.oninput = () => {
      state.query = search.value.trim().toLowerCase();
      restate();
      hits.innerHTML = "";
      if (!state.query) { hits.hidden = true; return; }
      const found = [];
      for (let i = 0; i < COUNT && found.length < 40; i++) if (matches(i)) found.push(i);
      found.sort((a, b) => N.deg[b] - N.deg[a]).slice(0, 12).forEach((i) => {
        const b = el("button"); b.type = "button";
        const s = el("span"); s.textContent = N.label[i];
        const sm = el("small"); sm.textContent = GRAPH.files[N.file[i]] || (commOf.get(N.com[i]) || {}).name || "";
        b.append(s, sm);
        b.onclick = () => selectNode(i);
        hits.append(b);
      });
      hits.hidden = false;
    };

    document.querySelectorAll("[data-fold]").forEach((b) => {
      b.onclick = () => b.setAttribute("aria-expanded", b.getAttribute("aria-expanded") === "true" ? "false" : "true");
    });

    document.querySelectorAll("[data-act]").forEach((b) => {
      b.onclick = () => {
        switch (b.dataset.act) {
          case "replay": state.grow = 0; growing = true; break;
          case "spin": spin = !spin; b.setAttribute("aria-pressed", String(spin)); break;
          case "table": openTable(); break;
          case "table-close": $("#tablewrap").hidden = true; break;
          case "keys-close": $("#keys").hidden = true; break;
          case "deselect": deselect(); break;
          case "shot": savePng(); break;
        }
      };
    });

    addEventListener("keydown", (e) => {
      if (e.target.matches("input")) { if (e.key === "Escape") e.target.blur(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();

      // Digitos por e.code: shift+1 no produce "1" en la mayoria de teclados.
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit) {
        const n = +digit[1];
        if (e.shiftKey) {
          const btn = document.querySelectorAll("#jump button")[n - 1];
          if (btn) { btn.click(); flash(btn.textContent); }
        } else if (n <= VIEWS.length) {
          setView(n - 1); flash(VIEWS[n - 1].name);
        }
        return;
      }

      const region = CHROME.find((r) => r.key.toLowerCase() === k);
      if (region) { toggleChrome(region.id); return; }

      if (k === "u") toggleAllChrome();
      else if (e.key === "?" || k === "h") { $("#keys").hidden = !$("#keys").hidden; }
      else if (e.key === " ") { e.preventDefault(); spin = !spin; }
      else if (k === "r") { state.grow = 0; growing = true; }
      else if (k === "t") openTable();
      else if (k === "p") savePng();
      else if (e.key === "Escape") {
        $("#tablewrap").hidden = true; $("#keys").hidden = true;
        state.pick = null; state.pickKey = null; state.isolate = null;
        document.querySelectorAll("#jump button").forEach((x) => x.setAttribute("aria-pressed", "false"));
        deselect(); renderLegend();
      } else if (e.key === "/") {
        e.preventDefault();
        shown.add("controls"); applyChrome();
        $("#search").focus();
      }
    });
  }

  function savePng() {
    const a = el("a");
    a.download = "graphify-3d.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  /* ---------- tabla ---------- */
  const TCOLS = [
    ["Nodo", (i) => N.label[i]],
    ["Comunidad", (i) => (commOf.get(N.com[i]) || {}).name || "—"],
    ["Conexiones", (i) => N.deg[i]],
    ["Profundidad", (i) => (dep[i] >= UNREACH ? "—" : dep[i])],
    ["Archivo", (i) => GRAPH.files[N.file[i]] || "—"],
  ];
  let tSort = 2, tDesc = true;
  function openTable() {
    $("#tablewrap").hidden = false;
    const head = $("#table thead"), body = $("#table tbody");
    head.innerHTML = "";
    const tr = el("tr");
    TCOLS.forEach(([name], i) => {
      const th = el("th");
      th.textContent = name + (tSort === i ? (tDesc ? " ↓" : " ↑") : "");
      th.onclick = () => { if (tSort === i) tDesc = !tDesc; else { tSort = i; tDesc = true; } openTable(); };
      tr.append(th);
    });
    head.append(tr);
    const q = $("#tsearch").value.trim().toLowerCase();
    let rows = [...Array(COUNT).keys()];
    if (q) rows = rows.filter((i) => TCOLS.some(([, f]) => String(f(i)).toLowerCase().includes(q)));
    const f = TCOLS[tSort][1];
    rows.sort((a, b) => {
      const x = f(a), y = f(b);
      const c = typeof x === "number" ? x - y : String(x).localeCompare(String(y), "es");
      return tDesc ? -c : c;
    });
    const shown = rows.slice(0, 500);
    body.innerHTML = "";
    shown.forEach((i) => {
      const r = el("tr");
      TCOLS.forEach(([, fn], ci) => {
        const td = el("td");
        if (ci === 0) {
          const dot = el("i", "dot");
          const c = colorOf(i);
          dot.style.background = "rgb(" + c.map((v) => Math.round(v * 255)).join(",") + ")";
          td.append(dot);
        }
        td.append(document.createTextNode(String(fn(i))));
        r.append(td);
      });
      r.onclick = () => { $("#tablewrap").hidden = true; selectNode(i); };
      body.append(r);
    });
    $("#tablefoot").textContent = shown.length < rows.length
      ? "Mostrando " + shown.length + " de " + rows.length + " filas que cumplen el filtro. Refina la busqueda para ver el resto."
      : rows.length + " de " + COUNT + " nodos";
  }
  $("#tsearch").oninput = () => { if (!$("#tablewrap").hidden) openTable(); };

  /* ---------- arranque ---------- */
  // Asa de depuracion, solo si la URL lleva ?debug: permite verificar el
  // aislamiento y los niveles de click sin raton.
  if (location.search.indexOf("debug") >= 0) {
    window.__g3d = { state, selectNode, deselect, restate, renderLegend,
                     counts: () => [visibleNodes, visibleEdges] };
  }
  $("#title").textContent = META.title;
  buildUI();
  buildKeysPanel();
  applyChrome();
  recolor();
  setView(state.view, true);
  restate();
  renderLegend();
  resize();
  if (CFG.hint !== false) flash("?  teclas", 4200);
  requestAnimationFrame((t) => { last = t; frame(t); });
})();
