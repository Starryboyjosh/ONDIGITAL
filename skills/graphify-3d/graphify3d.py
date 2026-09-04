#!/usr/bin/env python3
"""graphify3d - capa visual 3D bajo demanda para grafos de graphify.

Lee un graph.json (formato node-link de graphify) y escribe UN solo archivo HTML
autocontenido: sin CDN, sin dependencias JS, sin conexion de red. El render usa
WebGL2 escrito a mano (puntos + lineas con blending aditivo), no three.js.

No se ejecuta como parte del pipeline de graphify: solo cuando se invoca.

Uso:
    graphify3d [RUTA] [-o SALIDA.html] [--theme pulso|abismo|tinta]
               [--view neural|galaxia|orbital|estratos|esfera|
                       nebulosa|solar|quasar|anillos]
               [--max-nodes N] [--iters N] [--title TEXTO] [--open]

RUTA acepta: graph.json, un directorio graphify-out/, o un repo que contenga
graphify-out/graph.json. Por defecto, el directorio actual.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import re
import sys
import webbrowser
from collections import deque
from html import escape
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE_DIR = HERE / "template"

# --- Paleta -----------------------------------------------------------------
# Los tres hues categoricos salen de la paleta de referencia del skill dataviz
# (columna dark) y estan validados con scripts/validate_palette.js en modo
# --pairs all (dispersion: cualquier par puede quedar adyacente en pantalla)
# contra las tres superficies de abajo: CVD dE 9.4, vision normal dE 20.9,
# contraste >= 3:1. Pasar de 3 hues rompe los pisos, asi que las comunidades
# 4+ caen en el neutro "Otras" en vez de generar hues nuevos.
# Cada comunidad lleva su color propio (decision del usuario, sobre la regla de
# 3 hues de la skill dataviz). Con 150+ grupos ninguna paleta categorica se
# distingue por si sola, asi que la identidad real la dan la leyenda, el
# aislamiento por click y el inspector; el color es densidad visual, no etiqueta.
GOLDEN = 137.50776405003785
HUE0 = 264.0
# Pequeno salto de luminosidad para separar hues que el angulo aureo deja
# proximos; la luminosidad base la fija el tamano del grupo.
JITTER = [0.0, 0.045, -0.030]

SELECT = "#FFFFFF"  # resaltado = luz blanca, nunca un color de comunidad


def _gamma(c: float) -> float:
    c = max(0.0, min(1.0, c))
    return c * 12.92 if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def _oklch_linear(L: float, C: float, H: float):
    h = math.radians(H)
    a, b = C * math.cos(h), C * math.sin(h)
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    t = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * t,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * t,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * t)


def oklch_hex(L: float, C: float, H: float) -> str:
    """OKLCh -> #RRGGBB, bajando croma hasta entrar en gamut sRGB."""
    rgb = _oklch_linear(L, C, H)
    for _ in range(48):
        if all(-1e-4 <= v <= 1.0 + 1e-4 for v in rgb):
            break
        C *= 0.94
        rgb = _oklch_linear(L, C, H)
    return "#%02X%02X%02X" % tuple(round(_gamma(v) * 255) for v in rgb)


def spin_palette(count: int, seed: int = 0) -> list:
    """Colores vivos y separados sobre fondo oscuro, tantos como haga falta.

    La lista viene ordenada por tamano de grupo, y la luminosidad sigue ese
    orden a la inversa: los grupos grandes son densos y su propio apilamiento
    ya los aclara al mezclar en aditivo, asi que se les da un tono mas oscuro y
    saturado. Los pequenos, dispersos, necesitan el extremo claro para verse.
    """
    out = []
    n = max(1, count - 1)
    for i in range(max(0, count)):
        t = i / n
        L = 0.615 + 0.195 * t + JITTER[(i + seed) % len(JITTER)]
        C = 0.235 - 0.040 * t
        out.append(oklch_hex(L, C, (HUE0 + (i + seed) * GOLDEN) % 360.0))
    return out


THEMES = {
    "noche": {
        "surface": "#06070A", "panel": "#101219", "line": "#1E212B",
        "ink": "#F2F4F8", "ink2": "#A8AEBD", "ink3": "#6E7585",
        "edge": "#39404F", "accent": "#7DD3FC",
    },
    "abismo": {
        "surface": "#0E0E0D", "panel": "#181817", "line": "#2B2B29",
        "ink": "#F5F4F0", "ink2": "#ADACA6", "ink3": "#7C7B76",
        "edge": "#54534F", "accent": "#D8A24A",
    },
    "pulso": {
        "surface": "#0B1410", "panel": "#12201A", "line": "#22352B",
        "ink": "#F2EFE4", "ink2": "#A9B3A8", "ink3": "#79857C",
        "edge": "#4A5A52", "accent": "#D8A24A",
    },
    "tinta": {
        "surface": "#080C14", "panel": "#111725", "line": "#212B3D",
        "ink": "#EEF1F7", "ink2": "#A5AEC0", "ink3": "#737D91",
        "edge": "#465266", "accent": "#9B8CFF",
    },
}

SEQ_RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf"]


# --- Carga ------------------------------------------------------------------

def resolve_graph_path(raw: str) -> Path:
    p = Path(raw).expanduser().resolve()
    candidates = []
    if p.is_file():
        candidates = [p]
    elif p.is_dir():
        candidates = [p / "graph.json", p / "graphify-out" / "graph.json"]
    for c in candidates:
        if c.is_file():
            return c
    tried = "\n  ".join(str(c) for c in candidates) or str(p)
    sys.exit(
        f"No encontre un graph.json. Busque en:\n  {tried}\n\n"
        "Genera el grafo primero (por ejemplo `/graphify .`) y vuelve a correr graphify3d."
    )


def load_graph(path: Path) -> tuple[list, list, dict]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        sys.exit(f"{path} no es JSON valido: {e}")
    nodes = data.get("nodes") or []
    edges = data.get("links") or data.get("edges") or []
    if not nodes:
        sys.exit(f"{path} no tiene nodos. Regenera el grafo antes de visualizarlo.")
    labels_path = path.parent / ".graphify_labels.json"
    labels = {}
    if labels_path.is_file():
        try:
            labels = {str(k): v for k, v in json.loads(labels_path.read_text(encoding="utf-8")).items()}
        except (json.JSONDecodeError, OSError):
            labels = {}
    return nodes, edges, {"commit": data.get("built_at_commit"), "labels": labels}


# --- Metricas ---------------------------------------------------------------

def bucket_of(source_file: str) -> str:
    if not source_file:
        return "(sin archivo)"
    parts = Path(source_file).parts
    if len(parts) <= 1:
        return "(raiz)"
    return parts[0]


def build_index(nodes: list, edges: list, max_nodes: int):
    """Indexa, poda al tope de nodos por grado y devuelve estructuras compactas."""
    idx = {}
    for n in nodes:
        nid = n.get("id")
        if nid is None or nid in idx:
            continue
        idx[nid] = len(idx)
    ordered = [None] * len(idx)
    for n in nodes:
        nid = n.get("id")
        if nid in idx and ordered[idx[nid]] is None:
            ordered[idx[nid]] = n

    adj = [[] for _ in ordered]
    kept_edges = []
    seen_pairs = set()
    for e in edges:
        s, t = idx.get(e.get("source")), idx.get(e.get("target"))
        if s is None or t is None or s == t:
            continue
        key = (s, t) if s < t else (t, s)
        if key in seen_pairs:
            continue
        seen_pairs.add(key)
        kept_edges.append((s, t, e))
        adj[s].append(t)
        adj[t].append(s)

    degrees = [len(a) for a in adj]
    dropped = 0
    if len(ordered) > max_nodes:
        keep = sorted(range(len(ordered)), key=lambda i: -degrees[i])[:max_nodes]
        keep_set = set(keep)
        remap = {}
        new_nodes = []
        for i in sorted(keep_set):
            remap[i] = len(new_nodes)
            new_nodes.append(ordered[i])
        dropped = len(ordered) - len(new_nodes)
        new_edges = [(remap[s], remap[t], e) for s, t, e in kept_edges
                     if s in keep_set and t in keep_set]
        ordered, kept_edges = new_nodes, new_edges
        adj = [[] for _ in ordered]
        for s, t, _ in kept_edges:
            adj[s].append(t)
            adj[t].append(s)
        degrees = [len(a) for a in adj]

    return ordered, kept_edges, adj, degrees, dropped


def multi_source_bfs(adj: list, sources: list) -> list:
    depth = [-1] * len(adj)
    q = deque()
    for s in sources:
        depth[s] = 0
        q.append(s)
    while q:
        cur = q.popleft()
        for nxt in adj[cur]:
            if depth[nxt] == -1:
                depth[nxt] = depth[cur] + 1
                q.append(nxt)
    return depth


# --- Layout 3D --------------------------------------------------------------

def fibonacci_sphere(count: int, seed: float = 0.0):
    pts = []
    ga = math.pi * (3.0 - math.sqrt(5.0))
    for i in range(count):
        y = 1 - (2 * i + 1) / max(1, count)
        r = math.sqrt(max(0.0, 1 - y * y))
        th = ga * i + seed
        pts.append((math.cos(th) * r, y, math.sin(th) * r))
    return pts


def connected_components(node_count: int, edges: list) -> list:
    """BFS por componente conexa. Devuelve un id de componente por nodo,
    ordenado por tamano descendente (0 = la componente gigante)."""
    adj = [[] for _ in range(node_count)]
    for s, t, _ in edges:
        adj[s].append(t)
        adj[t].append(s)
    comp = [-1] * node_count
    order = []
    for start in range(node_count):
        if comp[start] != -1:
            continue
        cid = len(order)
        q = deque([start])
        comp[start] = cid
        size = 0
        while q:
            cur = q.popleft()
            size += 1
            for nxt in adj[cur]:
                if comp[nxt] == -1:
                    comp[nxt] = cid
                    q.append(nxt)
        order.append(size)
    # Renumera por tamano descendente para que 0 sea siempre la gigante.
    rank = {old: new for new, old in enumerate(sorted(range(len(order)), key=lambda i: -order[i]))}
    return [rank[c] for c in comp], [order[old] for old in sorted(range(len(order)), key=lambda i: -order[i])]


def layout_3d(node_count: int, edges: list, comms: list, degrees: list, iters: int, seed: int = 7,
              *, kr: float = 0.0026, gravity: float = 0.22, rest: float = 1.0, seat: float = 0.0,
              sample: int = 128, speed: float = 0.10, satellite_gravity: float = 0.02):
    """Layout 3D estilo ForceAtlas2: atraccion lineal, repulsion ponderada por grado.

    La repulsion exacta es O(n^2) por iteracion; aqui cada nodo se repele contra
    una muestra aleatoria que cambia en cada paso y se reescala por n/muestra.
    Frente a Fruchterman-Reingold (atraccion cuadratica) esta ley deja los grupos
    abiertos en vez de colapsarlos en nudos, que es lo que hace legible el 3D.

    Las componentes conexas que no son la gigante se siembran lejos del nucleo y
    casi sin gravedad propia: quedan flotando como satelites aislados en vez de
    colapsar al mismo centro que el resto, que es como luce un grafo real (varios
    componentes sueltos) en el 2D de graphify.
    """
    try:
        import numpy as np
    except ImportError:
        return _layout_fallback(node_count, comms, seed)

    rng = np.random.default_rng(seed)
    uniq = sorted(set(comms))
    cmap = {c: i for i, c in enumerate(uniq)}
    cidx = np.array([cmap[c] for c in comms], dtype=np.int64)

    comp, comp_sizes = connected_components(node_count, edges)
    comp_arr = np.array(comp, dtype=np.int64)
    n_comp = len(comp_sizes)
    is_satellite = comp_arr != 0

    # Semilla: la componente gigante en una bola uniforme al centro. Cada
    # componente suelta recibe su propio ancla lejana (mas lejos cuanto mas
    # chica) para que no se confunda con el nucleo desde el primer paso.
    dirs = rng.normal(size=(node_count, 3))
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    pos = dirs * (rng.random((node_count, 1)) ** (1 / 3)) * 0.9
    pos += np.array(fibonacci_sphere(len(uniq)), dtype=np.float64)[cidx] * seat

    if n_comp > 1:
        # Direcciones al azar (no Fibonacci): con Fibonacci los satelites caen
        # en un anillo perfecto y delatan el truco. La distancia depende del
        # tamano: la componente suelta mas grande queda cerca, como un segundo
        # nucleo; las minusculas (a veces un solo nodo) quedan mas lejos, como
        # motas sueltas — igual que en el 2D real de graphify.
        anchor_dirs = rng.normal(size=(n_comp - 1, 3))
        anchor_dirs /= np.linalg.norm(anchor_dirs, axis=1, keepdims=True)
        second_biggest = max(1, comp_sizes[1]) if n_comp > 1 else 1
        anchors = np.zeros((n_comp, 3), dtype=np.float64)
        for cid in range(1, n_comp):
            size_norm = min(1.0, comp_sizes[cid] / second_biggest)
            far = 1.15 + 0.75 * (1.0 - size_norm) + 0.15 * rng.random()
            anchors[cid] = anchor_dirs[cid - 1] * far
        pos += anchors[comp_arr]

    mass = np.asarray(degrees, dtype=np.float64) + 1.0
    grav = np.where(is_satellite, satellite_gravity, gravity)
    if edges:
        src = np.array([e[0] for e in edges], dtype=np.int64)
        dst = np.array([e[1] for e in edges], dtype=np.int64)
        w = np.clip(np.array([float(e[2].get("weight", 1.0) or 1.0) for e in edges]), 0.25, 3.0)
    else:
        src = dst = np.zeros(0, dtype=np.int64)
        w = np.zeros(0)

    sample = int(min(max(16, node_count - 1), sample))
    scale_rep = kr * node_count / sample

    for step in range(iters):
        picks = rng.integers(0, node_count, size=(node_count, sample))
        delta = pos[:, None, :] - pos[picks]
        d2 = np.einsum("ijk,ijk->ij", delta, delta) + 1e-4
        fac = np.minimum((mass[:, None] * mass[picks]) / d2, 1.0e4)
        disp = np.einsum("ij,ijk->ik", fac, delta) * scale_rep

        if len(src):
            d = pos[src] - pos[dst]
            dist = np.sqrt(np.einsum("ij,ij->i", d, d)) + 1e-6
            # Muelle con longitud de reposo: fija la distancia visible de la
            # arista en vez de colapsar cada comunidad a un punto.
            pull = ((w * (dist - rest)) / dist)[:, None] * d
            np.subtract.at(disp, src, pull)
            np.add.at(disp, dst, pull)

        # Cada satelite gravita hacia su propia ancla, no hacia el origen: si
        # no, en cuanto se enfria el sistema termina arrastrado al nucleo.
        center = anchors[comp_arr] if n_comp > 1 else 0.0
        disp -= (pos - center) * (grav[:, None] * mass[:, None])

        radius = float(np.sqrt(np.einsum("ij,ij->i", pos, pos)).mean()) + 1e-6
        cool = (1.0 - step / iters) ** 0.9 + 0.05
        norm = np.sqrt(np.einsum("ij,ij->i", disp, disp)) + 1e-12
        cap = speed * radius * cool
        pos += disp / norm[:, None] * np.minimum(norm, cap)[:, None]

    core_mask = comp_arr == 0
    pos -= pos[core_mask].mean(axis=0)
    # La escala sale solo del nucleo: si se calculara sobre todo (nucleo +
    # satelites lejanos) los satelites lo dominarian y el nucleo encogeria a
    # un punto cada vez que hay una componente suelta grande.
    scale = float(np.percentile(np.linalg.norm(pos[core_mask], axis=1), 97)) or 1.0
    pos /= scale
    return [[round(float(v), 4) for v in p] for p in pos]


def _layout_fallback(node_count: int, comms: list, seed: int):
    """Sin numpy: esferas por comunidad. Feo pero determinista y nunca falla."""
    rng = random.Random(seed)
    uniq = sorted(set(comms))
    centers = dict(zip(uniq, fibonacci_sphere(len(uniq))))
    out = []
    for c in comms:
        cx, cy, cz = centers[c]
        r = 0.16 * (rng.random() ** (1 / 3))
        ux, uy, uz = fibonacci_sphere(1, rng.random() * 6.28)[0]
        out.append([round(cx + ux * r, 4), round(cy + uy * r, 4), round(cz + uz * r, 4)])
    return out


# --- Payload ----------------------------------------------------------------

DEFAULT_SHORTCUTS = [
    {"label": "Vito", "match": ["vito"]},
    {"label": "OnRoute", "match": ["onroute", "onserve"]},
    {"label": "OnStock", "match": ["onstock"]},
    {"label": "Credental", "match": ["credental"]},
]


def build_shortcuts(nodes, degrees, adj, comms, sizes, configured=None):
    """Botones de acceso directo: cada uno aisla un subconjunto de nodos.

    Los que no encuentran ningun nodo se omiten en vez de quedar muertos: el
    grafo puede ser anterior a que el producto existiera o haberse renombrado
    (por eso cada entrada acepta varios alias).
    """
    out = []
    for spec in (configured or DEFAULT_SHORTCUTS):
        terms = [t.lower() for t in spec.get("match", []) if t]
        if not terms:
            continue
        ids = []
        for i, nd in enumerate(nodes):
            hay = (str(nd.get("id", "")) + " " + str(nd.get("source_file") or "")).lower()
            if any(t in hay for t in terms):
                ids.append(i)
        if ids:
            out.append({"label": spec.get("label") or terms[0], "ids": ids,
                        "note": str(len(ids)) + " nodos"})

    # "La conexion mas grande": el nodo con mas relaciones, con su vecindario.
    if degrees:
        hub = max(range(len(degrees)), key=lambda i: degrees[i])
        ring = sorted(set(adj[hub])) if hub < len(adj) else []
        out.append({"label": "Mayor nexo", "ids": [hub] + list(ring), "focus": hub,
                    "note": str(nodes[hub].get("label") or nodes[hub].get("id"))
                            + " \u00b7 " + str(degrees[hub]) + " relaciones"})
    return out


def build_payload(nodes, edges, adj, degrees, dropped, meta, iters, title):
    n = len(nodes)

    comms = [int(nd.get("community", -1) or 0) if nd.get("community") is not None else -1
             for nd in nodes]
    comm_names = {}
    for nd, c in zip(nodes, comms):
        if c not in comm_names and nd.get("community_name"):
            comm_names[c] = str(nd["community_name"])
    for cid, name in meta.get("labels", {}).items():
        try:
            comm_names.setdefault(int(cid), str(name))
        except (TypeError, ValueError):
            continue

    sizes = {}
    for c in comms:
        sizes[c] = sizes.get(c, 0) + 1
    ranked = sorted(sizes.items(), key=lambda kv: (-kv[1], kv[0]))

    god_count = max(3, min(12, n // 150))
    god = sorted(range(n), key=lambda i: -degrees[i])[:god_count]
    depth = multi_source_bfs(adj, god)

    files, file_ix = [], {}
    buckets, bucket_ix = [], {}
    types, type_ix = [], {}
    node_file, node_bucket, node_type, labels, ids, locs = [], [], [], [], [], []
    for nd in nodes:
        sf = str(nd.get("source_file") or "")
        if sf not in file_ix:
            file_ix[sf] = len(files); files.append(sf)
        node_file.append(file_ix[sf])
        b = bucket_of(sf)
        if b not in bucket_ix:
            bucket_ix[b] = len(buckets); buckets.append(b)
        node_bucket.append(bucket_ix[b])
        t = str(nd.get("type") or nd.get("file_type") or "nodo")
        if t not in type_ix:
            type_ix[t] = len(types); types.append(t)
        node_type.append(type_ix[t])
        labels.append(str(nd.get("label") or nd.get("id") or "?"))
        ids.append(str(nd.get("id") or ""))
        locs.append(str(nd.get("source_location") or ""))

    pos = layout_3d(n, edges, comms, degrees, iters)
    comp, _comp_sizes = connected_components(n, edges)

    rels, rel_ix, e_rel, e_src, e_dst, e_conf = [], {}, [], [], [], []
    for s, t, e in edges:
        e_src.append(s); e_dst.append(t)
        e_conf.append(1 if str(e.get("confidence", "")).upper() == "INFERRED" else 0)
        r = str(e.get("relation") or "rel")
        if r not in rel_ix:
            rel_ix[r] = len(rels); rels.append(r)
        e_rel.append(rel_ix[r])

    order = sorted(sizes.items(), key=lambda kv: (-kv[1], kv[0]))
    comm_colors = spin_palette(len(order))
    communities = [{
        "id": cid,
        "name": comm_names.get(cid) or (f"comunidad {cid}" if cid >= 0 else "sin comunidad"),
        "size": size,
        "color": comm_colors[i],
    } for i, (cid, size) in enumerate(order)]

    shortcuts = build_shortcuts(nodes, degrees, adj, comms, sizes, meta.get("shortcuts"))

    return {
        "meta": {
            "title": title,
            "generated": datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %Z"),
            "commit": meta.get("commit"),
            "nodes": n,
            "edges": len(e_src),
            "communities": len(sizes),
            "dropped": dropped,
            "iters": iters,
            "inferred": sum(e_conf),
        },
        "nodes": {
            "id": ids, "label": labels, "file": node_file, "loc": locs,
            "com": comms, "deg": degrees, "dep": depth, "cmp": comp,
            "lay": node_bucket, "typ": node_type,
            "pos": [v for p in pos for v in p],
        },
        "files": files, "layers": buckets, "types": types, "relations": rels,
        "layerColors": spin_palette(len(buckets), seed=5),
        "communities": communities, "god": god, "shortcuts": shortcuts,
        "edges": {"s": e_src, "t": e_dst, "c": e_conf, "r": e_rel},
    }


# --- Salida -----------------------------------------------------------------

def render_html(payload: dict, theme: str, view: str, chrome: list, hint: bool) -> str:
    shell = (TEMPLATE_DIR / "shell.html").read_text(encoding="utf-8")
    css = (TEMPLATE_DIR / "viewer.css").read_text(encoding="utf-8")
    js = (TEMPLATE_DIR / "viewer.js").read_text(encoding="utf-8")
    palette = {
        "select": SELECT,
        "seq": SEQ_RAMP, "theme": THEMES[theme], "themeName": theme,
    }
    # "</" se escapa para que ninguna etiqueta del grafo cierre el <script>.
    def embed(obj):
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    data = embed(payload)
    config = embed({"palette": palette, "view": view, "chrome": chrome, "hint": hint})
    t = THEMES[theme]
    css_vars = "\n".join(f"  --{k}: {v};" for k, v in t.items())
    return (shell
            .replace("/*THEME_VARS*/", css_vars)
            .replace("/*VIEWER_CSS*/", css)
            .replace("__TITLE__", escape(payload["meta"]["title"]))
            .replace("__SURFACE__", t["surface"])
            .replace('"__CONFIG__"', config)
            .replace('"__DATA__"', data)
            .replace("/*VIEWER_JS*/", js))


VIEW_KEYS = ["neural", "galaxia", "orbital", "estratos", "esfera",
             "nebulosa", "solar", "quasar", "anillos"]
# Regiones de interfaz que pueden arrancar visibles. Vacio = solo la red.
CHROME_KEYS = ["topbar", "controls", "legend", "stats", "info"]

CONFIG_NAME = "graphify3d.config.js"


def load_config(explicit: str | None, repo: Path) -> dict:
    """Lee la configuracion de la vista desde un config.js.

    Orden: --config, <repo>/graphify3d.config.js, y el config.js que acompana a
    la skill. El archivo es JS legible, pero el objeto que exporta debe ser JSON
    valido: se extrae entre la primera llave y la ultima y se parsea con json,
    sin evaluar nada.
    """
    candidates = []
    if explicit:
        candidates.append(Path(explicit).expanduser())
    candidates.append(repo / CONFIG_NAME)
    candidates.append(HERE / "config.js")
    for c in candidates:
        try:
            if not c.is_file():
                continue
            raw = c.read_text(encoding="utf-8")
        except OSError:
            continue
        body = re.sub(r"/\*.*?\*/", "", raw, flags=re.S)
        body = re.sub(r"^\s*//.*$", "", body, flags=re.M)
        try:
            body = body[body.index("{"):body.rindex("}") + 1]
            body = re.sub(r",(\s*[}\]])", r"\1", body)
            cfg = json.loads(body)
        except (ValueError, json.JSONDecodeError) as exc:
            print(f"  aviso      {c} no se pudo leer como JSON ({exc}); se ignora", file=sys.stderr)
            continue
        if isinstance(cfg, dict):
            cfg["_source"] = str(c)
            return cfg
    return {}


def main(argv=None):
    ap = argparse.ArgumentParser(prog="graphify3d", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path", nargs="?", default=".", help="graph.json, graphify-out/ o el repo")
    ap.add_argument("-o", "--out", default=None, help="HTML de salida (por defecto graph3d.html junto al grafo)")
    ap.add_argument("--theme", choices=sorted(THEMES), default=None)
    ap.add_argument("--view", choices=VIEW_KEYS, default=None)
    ap.add_argument("--max-nodes", type=int, default=None, help="poda por grado sobre este tope (default 6000)")
    ap.add_argument("--iters", type=int, default=None, help="iteraciones del layout (default 400)")
    ap.add_argument("--title", default=None)
    ap.add_argument("--config", default=None, help=f"ruta a un {CONFIG_NAME}")
    ap.add_argument("--chrome", default=None,
                    help="regiones visibles al abrir, separadas por comas ("
                         + ", ".join(CHROME_KEYS) + "); vacio = solo la red")
    ap.add_argument("--no-hint", action="store_true", help="sin el aviso de teclas al abrir")
    ap.add_argument("--open", action="store_true", help="abrir en el navegador al terminar")
    args = ap.parse_args(argv)

    gpath = resolve_graph_path(args.path)
    repo = gpath.parent.parent
    cfg = load_config(args.config, repo)
    # La bandera de linea de comandos manda sobre el config.js.
    view = args.view or cfg.get("view") or "neural"
    theme = args.theme or cfg.get("theme") or "noche"
    max_nodes = args.max_nodes or int(cfg.get("maxNodes") or 6000)
    iters = args.iters or int(cfg.get("iters") or 400)
    if view not in VIEW_KEYS:
        print(f"  aviso      vista '{view}' desconocida; se usa neural", file=sys.stderr); view = "neural"
    if theme not in THEMES:
        print(f"  aviso      tema '{theme}' desconocido; se usa noche", file=sys.stderr); theme = "noche"

    chrome = [c for c in (cfg.get("chrome") or []) if c in CHROME_KEYS]
    for c in (cfg.get("chrome") or []):
        if c not in CHROME_KEYS:
            print(f"  aviso      region '{c}' desconocida; se ignora (validas: "
                  + ", ".join(CHROME_KEYS) + ")", file=sys.stderr)
    if args.chrome is not None:
        asked = [c.strip() for c in args.chrome.split(",") if c.strip()]
        if len(asked) == 1 and asked[0].lower() in ("none", "nada"):
            asked = []
        for c in asked:
            if c not in CHROME_KEYS:
                print(f"  aviso      region '{c}' desconocida; se ignora (validas: "
                      + ", ".join(CHROME_KEYS) + ")", file=sys.stderr)
        chrome = [c for c in asked if c in CHROME_KEYS]
    hint = cfg.get("hint") is not False and not args.no_hint

    raw_nodes, raw_edges, meta = load_graph(gpath)
    if isinstance(cfg.get("shortcuts"), list):
        meta["shortcuts"] = cfg["shortcuts"]
    nodes, edges, adj, degrees, dropped = build_index(raw_nodes, raw_edges, max_nodes)
    title = args.title or f"{repo.name or 'grafo'} · red 3D"

    print(f"  grafo      {gpath}")
    print(f"  nodos      {len(nodes)}" + (f"  ({dropped} podados por grado)" if dropped else ""))
    print(f"  aristas    {len(edges)}")
    if cfg.get("_source"):
        print(f"  config     {cfg['_source']}")
    print(f"  layout     force-3D, {iters} iteraciones", flush=True)

    payload = build_payload(nodes, edges, adj, degrees, dropped, meta, iters, title)
    html = render_html(payload, theme, view, chrome, hint)

    out = Path(args.out).expanduser().resolve() if args.out else gpath.parent / "graph3d.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    kb = out.stat().st_size / 1024
    print(f"  tema       {theme} · vista {view}")
    print(f"  interfaz   {', '.join(chrome) if chrome else 'oculta (solo la red)'}" + ("" if hint else " · sin aviso"))
    print(f"\n  -> {out}  ({kb:.0f} KB, autocontenido, sin red)")
    if args.open:
        webbrowser.open(out.as_uri())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
