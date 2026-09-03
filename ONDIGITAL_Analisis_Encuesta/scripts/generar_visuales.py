#!/usr/bin/env python3
"""Regenera los visuales del análisis de la encuesta ONDIGITAL.

Produce, a partir de datos_limpios_y_enriquecidos.csv (única fuente de verdad):
  - graficos/01..15_*.png
  - infografia_resumen.png
  - Informe_Visual_ONDIGITAL.pdf

Todas las cifras se recalculan desde el CSV y se contrastan contra
resumen_metricas.json; si algo no coincide el script falla en lugar de dibujar
un número inventado.

Paleta oficial ONDIGITAL "Pulso Vital" (ver AGENTS.md y LEEME.txt). Sobre fondo
claro se usan las variantes que cumplen WCAG AA. Las rampas ordinales son de un
solo tono y monótonas en luminancia, así que también se leen en escala de grises
y para las deficiencias de visión cromática más comunes.

Requiere: pandas, matplotlib, reportlab.
Uso: python3 scripts/generar_visuales.py
"""

from __future__ import annotations

import json
import logging
import re
import sys
import textwrap
from collections import Counter
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.font_manager import FontProperties, findfont
from PIL import Image as PILImage
from reportlab.lib import colors as rlcolors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
GRAFICOS = ROOT / "graficos"

# --- Paleta "Pulso Vital" -------------------------------------------------
INK = "#0B1410"          # tinta verdigris profunda
INK_PANEL = "#12201A"
MUTED = "#5F5B4E"        # texto secundario cálido (6.79:1 sobre blanco)
LINE = "#DBD5C4"
SURFACE = "#FFFFFF"
PARCHMENT = "#F2EFE4"
BRASS_AA = "#8C6A2A"     # latón variante AA sobre claro (4.99:1)
VIOLET_AA = "#6C35ED"    # violeta variante AA sobre claro (6.23:1)
BRASS = "#D8A24A"        # latón de marca (solo sobre oscuro)

# Serie categórica validada todos-contra-todos (ΔE CVD 8.1, visión normal 15.2).
SERIES = ["#976B15", "#6948E2", "#098260", "#9D2680", "#1277B7", "#9A210C", "#5F5B4E"]
# Rampa ordinal de un solo tono (latón), monótona en luminancia.
ORDINAL = ["#956F26", "#7D5D1F", "#674B17", "#513B10", "#3C2B08"]

FONT_DISPLAY = ["Fraunces", "DejaVu Serif", "serif"]
FONT_BODY = ["Inter", "Noto Sans", "DejaVu Sans", "sans-serif"]
FONT_MONO = ["JetBrains Mono", "DejaVu Sans Mono", "monospace"]

FUENTE = "Fuente: Encuesta ONDIGITAL-MicroEmpresa, n=321. Elaboración propia."


def ordinal_colors(count: int) -> list[str]:
    """Toma `count` pasos de la rampa ordinal conservando los extremos."""
    if count <= 1:
        return [ORDINAL[-1]]
    step = (len(ORDINAL) - 1) / (count - 1)
    return [ORDINAL[round(i * step)] for i in range(count)]


def setup_matplotlib() -> None:
    # Las familias son cadenas de respaldo: si Fraunces/Inter no están instaladas
    # el renderizado cae a la siguiente opción sin romper la salida.
    logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
    plt.rcParams.update(
        {
            "font.family": FONT_BODY,
            "font.size": 13,
            "figure.facecolor": SURFACE,
            "axes.facecolor": SURFACE,
            "savefig.facecolor": SURFACE,
            "text.color": INK,
            "axes.labelcolor": MUTED,
            "xtick.color": MUTED,
            "ytick.color": INK,
            "axes.edgecolor": LINE,
            "axes.linewidth": 1.0,
            "savefig.dpi": 200,
        }
    )


# --- Datos ---------------------------------------------------------------
def load() -> tuple[pd.DataFrame, list[str], dict]:
    df = pd.read_csv(ROOT / "datos_limpios_y_enriquecidos.csv")
    metrics = json.loads((ROOT / "resumen_metricas.json").read_text(encoding="utf-8"))
    if len(df) != metrics["n"]:
        raise SystemExit(f"n no coincide: CSV={len(df)} json={metrics['n']}")
    return df, list(df.columns), metrics


def multiselect(series: pd.Series) -> Counter:
    tally: Counter = Counter()
    for value in series.fillna(""):
        for part in str(value).split(";"):
            part = part.strip()
            if part:
                tally[part] += 1
    return tally


Q10 = re.compile(r"^Mejorar[íi]a (.+?) porque (.+?) para (.+?)\.$")


def parse_q10(series: pd.Series) -> tuple[Counter, Counter, Counter, int]:
    proceso: Counter = Counter()
    problema: Counter = Counter()
    objetivo: Counter = Counter()
    sin_plantilla = 0
    for value in series.fillna(""):
        match = Q10.match(str(value).strip())
        if not match:
            sin_plantilla += 1
            continue
        proceso[match.group(1)] += 1
        problema[match.group(2)] += 1
        objetivo[match.group(3)] += 1
    return proceso, problema, objetivo, sin_plantilla


def check(label: str, got: float, expected: float, tol: float = 0.06) -> None:
    if abs(got - expected) > tol:
        raise SystemExit(f"Discrepancia en «{label}»: calculado {got} vs publicado {expected}")


# --- Dibujo --------------------------------------------------------------
def text_width_in(fig, text: str, size: float, weight: str, family: list[str]) -> float:
    """Ancho real del bloque de texto en pulgadas, medido con el renderer."""
    prop = FontProperties(family=family, size=size, weight=weight)
    renderer = fig.canvas.get_renderer()
    return max(
        renderer.get_text_width_height_descent(line, prop, False)[0]
        for line in text.split("\n")
    ) / fig.dpi


def wrap_to_width(
    fig, text: str, size: float, weight: str, family: list[str], max_in: float
) -> str:
    """Envuelve el texto hasta que quepa de verdad en el ancho de la figura.

    Se mide con el renderer en vez de estimar por número de caracteres, así que
    ningún titular vuelve a salir cortado por el borde derecho.
    """
    if text_width_in(fig, text, size, weight, family) <= max_in:
        return text
    for chars in range(len(text) - 1, 9, -1):
        candidate = textwrap.fill(text, chars)
        if text_width_in(fig, candidate, size, weight, family) <= max_in:
            return candidate
    return text


def frame(
    fig,
    title: str,
    subtitle: str,
    footer: str | list[str],
    title_size: float = 21.0,
    sub_size: float = 13.5,
    wrap: int = 100,
) -> tuple[float, float]:
    """Coloca titular, bajada y pie con geometría en pulgadas.

    Devuelve el rect (bottom, top) en fracciones para tight_layout, de modo que
    la banda de encabezado mide lo mismo en un gráfico de 4 barras que en uno
    de 15 y la bajada nunca se corta ni pisa al eje.
    """
    height = fig.get_figheight()
    usable = fig.get_figwidth() - 0.32
    title = wrap_to_width(fig, title, title_size, "bold", FONT_DISPLAY, usable)
    wrapped = wrap_to_width(fig, textwrap.fill(subtitle, wrap), sub_size, "normal", FONT_BODY, usable)
    title_lines = title.count("\n") + 1
    lines = wrapped.count("\n") + 1
    title_in = title_size / 72 * 1.35 * title_lines
    sub_in = sub_size / 72 * 1.45 * lines
    header_in = 0.16 + title_in + 0.22 + sub_in + 0.30
    footer_lines = [footer] if isinstance(footer, str) else list(footer)
    footer_text = "\n".join(
        wrap_to_width(fig, line, 10.5, "normal", FONT_BODY, usable) for line in footer_lines
    )
    footer_in = 0.30 + 0.20 * (footer_text.count("\n") + 1)

    fig.text(
        0.012,
        1 - 0.14 / height,
        title,
        ha="left",
        va="top",
        fontsize=title_size,
        fontweight="bold",
        color=INK,
        family=FONT_DISPLAY,
        linespacing=1.25,
    )
    fig.text(
        0.012,
        1 - (0.16 + title_in + 0.22) / height,
        wrapped,
        ha="left",
        va="top",
        fontsize=sub_size,
        color=MUTED,
        linespacing=1.45,
    )
    fig.text(
        0.012,
        0.12 / height,
        footer_text,
        ha="left",
        va="bottom",
        fontsize=10.5,
        color=MUTED,
        linespacing=1.45,
    )
    return footer_in / height, 1 - header_in / height


def barh(
    filename: str,
    title: str,
    subtitle: str,
    labels: list[str],
    values: list[float],
    counts: list[int] | None = None,
    colors: list[str] | str = BRASS_AA,
    xlabel: str = "% de las respuestas (n = 321)",
    note: str | None = None,
    width: float = 11.0,
) -> Path:
    height = 1.9 + max(0.62 * len(labels), 2.2)
    fig, ax = plt.subplots(figsize=(width, height))
    positions = range(len(labels))
    bar_colors = [colors] * len(labels) if isinstance(colors, str) else colors
    ax.barh(list(positions), values, color=bar_colors, height=0.68, zorder=3)
    ax.set_yticks(list(positions))
    ax.set_yticklabels(labels, fontsize=12)
    ax.invert_yaxis()
    top = max(values) * 1.22
    ax.set_xlim(0, top)
    for index, value in enumerate(values):
        text = f"{value:.1f}%" if counts is None else f"{value:.1f}%  ({counts[index]})"
        ax.text(
            value + top * 0.015,
            index,
            text,
            va="center",
            fontsize=12,
            color=INK,
            family=FONT_MONO,
        )
    ax.set_xlabel(xlabel, fontsize=11)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color(LINE)
    ax.spines["bottom"].set_color(LINE)
    ax.tick_params(axis="both", length=0)
    ax.grid(axis="x", color=LINE, linewidth=0.9, zorder=0)
    ax.set_axisbelow(True)

    footer = [FUENTE] if note is None else [note, FUENTE]
    bottom, top_rect = frame(fig, title, subtitle, footer)
    fig.tight_layout(rect=(0.0, bottom, 1.0, top_rect))
    path = GRAFICOS / filename
    fig.savefig(path)
    plt.close(fig)
    return path


def heatmap(filename: str, table: pd.DataFrame, title: str, subtitle: str) -> Path:
    cmap = LinearSegmentedColormap.from_list("laton", ["#FFFDF8", "#F0DDB4", *ORDINAL])
    fig, ax = plt.subplots(figsize=(11.0, 6.8))
    data = table.to_numpy()
    image = ax.imshow(data, cmap=cmap, vmin=0, vmax=100, aspect="auto")
    ax.set_xticks(range(table.shape[1]))
    ax.set_xticklabels(table.columns, fontsize=12)
    ax.set_yticks(range(table.shape[0]))
    ax.set_yticklabels(table.index, fontsize=12)
    ax.tick_params(length=0)
    for spine in ax.spines.values():
        spine.set_visible(False)
    for row in range(table.shape[0]):
        for col in range(table.shape[1]):
            value = data[row][col]
            # Umbral de legibilidad: sobre celda oscura el texto va en pergamino.
            ax.text(
                col,
                row,
                f"{value:.0f}%",
                ha="center",
                va="center",
                fontsize=13,
                family=FONT_MONO,
                color=PARCHMENT if value >= 45 else INK,
            )
    bar = fig.colorbar(image, ax=ax, fraction=0.030, pad=0.02)
    bar.set_label("% dentro de la fila", color=MUTED, fontsize=11)
    bar.outline.set_visible(False)
    bar.ax.tick_params(color=MUTED, labelcolor=MUTED, length=0)
    bottom, top_rect = frame(fig, title, subtitle, FUENTE)
    fig.tight_layout(rect=(0.0, bottom, 1.0, top_rect))
    path = GRAFICOS / filename
    fig.savefig(path)
    plt.close(fig)
    return path


def infografia(rows: list[tuple[str, int, float]]) -> Path:
    fig, ax = plt.subplots(figsize=(13.0, 7.4))
    labels = [r[0] for r in rows]
    values = [r[2] for r in rows]
    positions = range(len(rows))
    ax.barh(list(positions), values, color=BRASS_AA, height=0.62, zorder=3)
    ax.set_yticks(list(positions))
    ax.set_yticklabels(labels, fontsize=14)
    ax.invert_yaxis()
    ax.set_xlim(0, 100)
    for index, (_, count, pct) in enumerate(rows):
        ax.text(
            pct + 1.4,
            index,
            f"{pct:.1f}%  ({count})",
            va="center",
            fontsize=13.5,
            color=INK,
            family=FONT_MONO,
        )
    ax.set_xlabel("% de la muestra (n = 321)", fontsize=12)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color(LINE)
    ax.spines["bottom"].set_color(LINE)
    ax.tick_params(length=0)
    ax.grid(axis="x", color=LINE, linewidth=0.9, zorder=0)
    ax.set_axisbelow(True)
    bottom, top_rect = frame(
        fig,
        "ONDIGITAL · Radiografía de oportunidad",
        "321 respuestas: dónde está el dolor, qué frena la modernización y qué implica para la propuesta de valor.",
        "Lectura recomendada: evidencia exploratoria. La estructura temporal y textual sugiere datos simulados o altamente guiados.",
        title_size=26,
        sub_size=14,
        wrap=115,
    )
    fig.tight_layout(rect=(0.0, bottom, 1.0, top_rect))
    path = ROOT / "infografia_resumen.png"
    fig.savefig(path)
    plt.close(fig)
    return path


# --- PDF -----------------------------------------------------------------
PDF_INK = rlcolors.HexColor(INK)
PDF_MUTED = rlcolors.HexColor(MUTED)
PDF_LINE = rlcolors.HexColor(LINE)
PDF_BRASS = rlcolors.HexColor(BRASS_AA)
PDF_PARCHMENT = rlcolors.HexColor(PARCHMENT)


def pdf_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()["BodyText"]
    return {
        "h1": ParagraphStyle("h1", parent=base, fontName="Helvetica-Bold", fontSize=26, leading=30, textColor=PDF_INK, spaceAfter=6),
        "h2": ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=PDF_INK, spaceBefore=10, spaceAfter=8),
        "h3": ParagraphStyle("h3", parent=base, fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=PDF_BRASS, spaceBefore=8, spaceAfter=4),
        "lead": ParagraphStyle("lead", parent=base, fontName="Helvetica", fontSize=12, leading=17, textColor=PDF_MUTED, spaceAfter=10),
        "body": ParagraphStyle("body", parent=base, fontName="Helvetica", fontSize=10.5, leading=15, textColor=PDF_INK, alignment=TA_LEFT, spaceAfter=7),
        "small": ParagraphStyle("small", parent=base, fontName="Helvetica-Oblique", fontSize=9, leading=12.5, textColor=PDF_MUTED, spaceAfter=6),
    }


def table_block(header: list[str], rows: list[list[str]], widths: list[float]) -> Table:
    table = Table([header, *rows], colWidths=widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PDF_INK),
                ("TEXTCOLOR", (0, 0), (-1, 0), PDF_PARCHMENT),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("TEXTCOLOR", (0, 1), (-1, -1), PDF_INK),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, PDF_LINE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [rlcolors.white, rlcolors.HexColor("#FAF8F1")]),
            ]
        )
    )
    return table


def assert_winansi(textos: list[str]) -> None:
    """Las fuentes base-14 de reportlab solo cubren cp1252.

    Un carácter fuera de ese repertorio (por ejemplo «→») se imprime como hueco
    en blanco sin lanzar error, así que se verifica antes de construir el PDF.
    """
    malos = sorted({c for t in textos for c in t if c not in "\n" and not _cp1252(c)})
    if malos:
        raise SystemExit(f"Caracteres no representables en el PDF: {malos!r}")


def _cp1252(char: str) -> bool:
    try:
        char.encode("cp1252")
    except UnicodeEncodeError:
        return False
    return True


def build_pdf(story_data: dict) -> Path:
    path = ROOT / "Informe_Visual_ONDIGITAL.pdf"
    styles = pdf_styles()
    doc = BaseDocTemplate(
        str(path),
        pagesize=A4,
        title="Informe Visual ONDIGITAL",
        author="ONDIGITAL",
        subject="Análisis exploratorio de la encuesta a microempresas",
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="cuerpo")

    def decorate(canvas, document):
        canvas.saveState()
        canvas.setFillColor(PDF_BRASS)
        canvas.rect(0, A4[1] - 6 * mm, A4[0], 6 * mm, stroke=0, fill=1)
        canvas.setStrokeColor(PDF_LINE)
        canvas.setLineWidth(0.4)
        canvas.line(18 * mm, 14 * mm, A4[0] - 18 * mm, 14 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(PDF_MUTED)
        canvas.drawString(18 * mm, 10 * mm, "ONDIGITAL · Encuesta exploratoria a microempresas")
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Página {document.page}")
        canvas.restoreState()

    doc.addPageTemplates([PageTemplate(id="std", frames=[frame], onPage=decorate)])
    doc.build(story_data["story"])
    return path


def main() -> None:
    setup_matplotlib()
    GRAFICOS.mkdir(exist_ok=True)
    df, cols, metrics = load()
    n = len(df)
    styles = pdf_styles()

    def pct(count: int) -> float:
        return round(count / n * 100, 1)

    def freq(column: str, order: list[str]) -> tuple[list[str], list[float], list[int]]:
        counts = df[column].astype(str).value_counts()
        missing = [key for key in order if key not in counts.index]
        if missing:
            raise SystemExit(f"Categorías ausentes en {column!r}: {missing}")
        values = [int(counts[key]) for key in order]
        return order, [pct(v) for v in values], values

    m = metrics["metricas"]
    check("Tecnología baja o muy baja", pct(int((df[cols[11]] <= 2).sum()), ), m["Tecnología baja o muy baja"]["pct"])
    check("Pierde 5+ h/semana", pct(int((df[cols[12]] >= 7.5).sum())), m["Pierde 5+ h/semana"]["pct"])
    check("Percibe pérdida 4-5/5", pct(int((df[cols[13]] >= 4).sum())), m["Percibe pérdida 4-5/5"]["pct"])
    check("Dispuesto o muy dispuesto", pct(int((df[cols[14]] >= 3).sum())), m["Dispuesto o muy dispuesto"]["pct"])
    check("Quiere equipo externo", pct(int((df[cols[15]] >= 3).sum())), m["Quiere equipo externo"]["pct"])
    check("Dispuesto a aprender", pct(int((df[cols[16]] >= 3).sum())), m["Dispuesto a aprender"]["pct"])

    generated: dict[str, Path] = {}

    # 01 · madurez tecnológica (ordinal)
    orden = ["Muy Bajo", "Bajo", "Medio", "Alto"]
    labels, values, counts = freq(cols[1], orden)
    bajo = pct(counts[0] + counts[1])
    check("madurez baja", bajo, m["Tecnología baja o muy baja"]["pct"], 0.2)
    generated["01"] = barh(
        "01_madurez_tecnologica.png",
        "Más de la mitad opera con madurez tecnológica baja",
        f"{bajo:.1f}% se ubica entre «Muy Bajo» y «Bajo» ({counts[0] + counts[1]} de {n} respuestas).",
        labels, values, counts, ordinal_colors(len(labels)),
    )

    # 02 · tiempo perdido (ordinal)
    orden = [
        "No se pierde el tiempo, todo está perfectamente optimizado",
        "Menos de 5 horas a la semana",
        "Entre 5 y 10 horas a la semana",
        "Mas de 10 horas a la semana",
    ]
    cortos = ["0 h / optimizado", "< 5 h", "5-10 h", "> 10 h"]
    _, values, counts = freq(cols[2], orden)
    cinco = pct(counts[2] + counts[3])
    check("pierde 5+ h", cinco, m["Pierde 5+ h/semana"]["pct"], 0.2)
    generated["02"] = barh(
        "02_tiempo_perdido.png",
        "El trabajo repetitivo consume tiempo significativo",
        f"{cinco:.1f}% estima perder al menos 5 horas por semana ({counts[2] + counts[3]} de {n}).",
        cortos, values, counts, ordinal_colors(len(cortos)),
    )

    # 03 · almacenamiento (multiselección, nominal)
    tally = multiselect(df[cols[3]])
    orden = [
        ("En libretas, folders o agendas físicas", "Papel / libretas"),
        ("En archivos de excel u otro programa de hojas de calculo", "Excel / hojas de cálculo"),
        ("En un software especializado en la nube", "Software en la nube"),
    ]
    counts = [tally[key] for key, _ in orden]
    values = [pct(c) for c in counts]
    manual = int(sum(1 for s in df[cols[3]].fillna("") if "libreta" in s or "excel" in s.lower()))
    check("papel y/o Excel", pct(manual), m["Usa papel y/o Excel"]["pct"], 0.2)
    generated["03"] = barh(
        "03_almacenamiento_informacion.png",
        "Papel y Excel todavía dominan la operación",
        f"{pct(manual):.1f}% usa papel y/o Excel en alguna parte de su gestión ({manual} de {n}).",
        [short for _, short in orden], values, counts, BRASS_AA,
        xlabel="% de personas (n = 321)",
        note=f"Multiselección: el porcentaje es sobre personas, no sobre menciones, y suma {sum(counts) / n * 100:.1f}%",
    )

    # 04 · percepción de pérdida (ordinal 1-5)
    orden = ["1", "2", "3", "4", "5"]
    _, values, counts = freq(cols[4], orden)
    alto = pct(counts[3] + counts[4])
    check("percibe pérdida 4-5", alto, m["Percibe pérdida 4-5/5"]["pct"], 0.2)
    generated["04"] = barh(
        "04_percepcion_perdida.png",
        "La percepción de pérdida económica está dividida",
        f"{alto:.1f}% puntúa 4 o 5 sobre 5; {values[2]:.1f}% se queda en el punto medio.",
        ["1 · nada", "2", "3", "4", "5 · mucho"], values, counts, ordinal_colors(len(orden)),
    )

    # 05 · disposición (ordinal)
    orden = ["Indispuesto", "Indiferente", "Dispuesto", "Muy Dispuesto"]
    labels, values, counts = freq(cols[5], orden)
    disp = pct(counts[2] + counts[3])
    check("dispuesto", disp, m["Dispuesto o muy dispuesto"]["pct"], 0.2)
    generated["05"] = barh(
        "05_disposicion_sistema_medida.png",
        "Existe disposición relevante hacia software a la medida",
        f"{disp:.1f}% se declara dispuesto o muy dispuesto ({counts[2] + counts[3]} de {n}).",
        labels, values, counts, ordinal_colors(len(labels)),
    )

    # 06 · frenos (nominal, respuesta única)
    orden = [
        ("Desconocimiento sobre que opciones existen", "Desconocimiento"),
        ("El costo del servicio", "Costo"),
        ("falta de tiempo para implementar o aprender una nueva herramienta", "Falta de tiempo"),
        ("No lo considero necesario", "No lo considera necesario"),
    ]
    _, values, counts = freq(cols[6], [key for key, _ in orden])
    generated["06"] = barh(
        "06_frenos_automatizacion.png",
        "El mayor freno no es el precio: es no saber qué opciones existen",
        f"{values[0]:.1f}% señala desconocimiento; {values[1]:.1f}% menciona costo.",
        [short for _, short in orden], values, counts, BRASS_AA,
    )

    # 07 · equipo externo (ordinal)
    orden = ["Para nada", "Inseguro", "Interesado", "Definitivamente"]
    labels, values, counts = freq(cols[7], orden)
    ext = pct(counts[2] + counts[3])
    check("equipo externo", ext, m["Quiere equipo externo"]["pct"], 0.2)
    generated["07"] = barh(
        "07_equipo_tecnologico_externo.png",
        "La propuesta de acompañamiento continuo tiene aceptación",
        f"{ext:.1f}% estaría interesado o definitivamente lo contrataría ({counts[2] + counts[3]} de {n}).",
        labels, values, counts, ordinal_colors(len(labels)),
    )

    # 08 · aprendizaje (ordinal)
    orden = ["Indispuesto", "Indiferente", "Dispuesto", "Muy Dispuesto"]
    labels, values, counts = freq(cols[8], orden)
    apr = pct(counts[2] + counts[3])
    check("aprendizaje", apr, m["Dispuesto a aprender"]["pct"], 0.2)
    generated["08"] = barh(
        "08_aprendizaje_tecnologia.png",
        "La mayoría está abierta a aprender herramientas nuevas",
        f"{apr:.1f}% se declara dispuesta o muy dispuesta ({counts[2] + counts[3]} de {n}).",
        labels, values, counts, ordinal_colors(len(labels)),
    )

    # 09 · factores de decisión (multiselección, nominal)
    tally = multiselect(df[cols[9]])
    orden = ["Precio accesible", "Aumente mis ingresos", "Facilidad de uso", "Automatice mi negocio"]
    counts = [tally[key] for key in orden]
    values = [pct(c) for c in counts]
    for key in orden:
        check(f"q9 {key}", pct(tally[key]), metrics["q9"][key]["pct"], 0.2)
    generated["09"] = barh(
        "09_factores_decision.png",
        "La compra debe justificarse por valor y simplicidad",
        "Ingresos, precio, facilidad y automatización aparecen casi empatados.",
        orden, values, counts, BRASS_AA,
        xlabel="% de personas (n = 321)",
        note=f"Multiselección: cada persona podía elegir varias opciones; la suma llega a {sum(counts) / n * 100:.1f}%",
    )

    proceso, problema, objetivo, sin_plantilla = parse_q10(df[cols[10]])
    if n - sin_plantilla != metrics["calidad_datos"]["q10_parseable_misma_plantilla"]:
        raise SystemExit("El conteo de respuestas abiertas con plantilla no coincide con resumen_metricas.json")

    # 10 · procesos prioritarios (nominal)
    top = proceso.most_common(12)
    generated["10"] = barh(
        "10_procesos_prioritarios.png",
        "No existe un único módulo ganador: la demanda es transversal",
        "Tareas recurrentes, compras, consultas y reportes encabezan el listado abierto.",
        [k for k, _ in top], [pct(v) for _, v in top], [v for _, v in top], BRASS_AA,
        xlabel="% de las respuestas abiertas (n = 321)",
        note="Pregunta abierta clasificada con la misma plantilla gramatical; se muestran las 12 categorías más citadas",
    )

    # 11 · problemas operativos (nominal)
    top = problema.most_common(12)
    generated["11"] = barh(
        "11_problemas_operativos.png",
        "Los dolores son de control, visibilidad y coordinación",
        "Olvidos, falta de estado real, actualizaciones tardías y responsabilidades difusas son frecuentes.",
        [k for k, _ in top], [pct(v) for _, v in top], [v for _, v in top], BRASS_AA,
        xlabel="% de las respuestas abiertas (n = 321)",
        note="Se muestran las 12 categorías más citadas",
    )

    # 12 · objetivos buscados (nominal)
    top = objetivo.most_common(10)
    generated["12"] = barh(
        "12_objetivos_busqueda.png",
        "Los usuarios quieren servicio, velocidad y centralización",
        "Los beneficios deseados encajan con una plataforma operacional centralizada.",
        [k for k, _ in top], [pct(v) for _, v in top], [v for _, v in top], BRASS_AA,
        xlabel="% de las respuestas abiertas (n = 321)",
        note="Se muestran las 10 categorías más citadas",
    )

    # 13 · heatmap madurez x disposición
    cross = pd.crosstab(df[cols[1]], df[cols[5]], normalize="index") * 100
    cross = cross.reindex(index=["Muy Bajo", "Bajo", "Medio", "Alto"],
                          columns=["Indispuesto", "Indiferente", "Dispuesto", "Muy Dispuesto"])
    muy_bajo_disp = cross.loc["Muy Bajo", "Dispuesto"]
    generated["13"] = heatmap(
        "13_heatmap_madurez_disposicion.png",
        cross,
        "El bloque «Muy Bajo» concentra la disposición declarada",
        f"En «Muy Bajo» (n = {int((df[cols[1]] == 'Muy Bajo').sum())}), {muy_bajo_disp:.1f}% cae en «Dispuesto»: "
        "una concentración tan extrema es señal de datos guiados, no de mercado.",
    )

    # 14 · segmentos comerciales (nominal)
    bonito = {
        "Interes medio / diagnostico": "Interés medio / diagnóstico",
        "Listo para vender": "Listo para vender",
        "Baja prioridad": "Baja prioridad",
        "Sensible al precio": "Sensible al precio",
        "Educar y nutrir": "Educar y nutrir",
    }
    seg = df[cols[19]].value_counts()
    orden = list(seg.index)
    counts = [int(seg[k]) for k in orden]
    values = [pct(c) for c in counts]
    for key in orden:
        check(f"segmento {key}", pct(int(seg[key])), metrics["segmentos"][key]["pct"], 0.2)
    generated["14"] = barh(
        "14_segmentos_comerciales.png",
        "Una segmentación heurística separa venta, educación y objeciones",
        "No es un scoring comercial validado; sirve para orientar mensajes y próximos experimentos.",
        [bonito[k] for k in orden], values, counts, BRASS_AA,
    )

    # 15 · índice de oportunidad (ordinal)
    orden = ["Baja", "Media", "Alta", "Muy alta"]
    labels, values, counts = freq(cols[18], orden)
    for key in orden:
        check(f"nivel {key}", pct(counts[orden.index(key)]), metrics["niveles_oportunidad"][key]["pct"], 0.2)
    generated["15"] = barh(
        "15_indice_oportunidad.png",
        "El índice exploratorio de oportunidad es polarizado",
        f"Promedio {df[cols[17]].mean():.1f}/100; combina madurez, dolor, tiempo perdido y disposición.",
        labels, values, counts, ordinal_colors(len(labels)),
    )

    # Infografía
    resumen_rows = [(k, v["n"], v["pct"]) for k, v in m.items()]
    info_path = infografia(resumen_rows)

    # --- PDF -------------------------------------------------------------
    ancho = A4[0] - 36 * mm
    story: list = []
    story.append(Paragraph("ONDIGITAL", styles["h1"]))
    story.append(Paragraph("Radiografía de oportunidad digital para microempresas", styles["h2"]))
    story.append(Paragraph(
        f"Análisis de {n} respuestas sobre madurez tecnológica, automatización, acompañamiento, "
        "aprendizaje y procesos prioritarios.", styles["lead"]))
    story.append(table_block(
        ["Indicador", "n", "% de la muestra"],
        [[k, str(v["n"]), f"{v['pct']:.1f}%"] for k, v in m.items()],
        [ancho * 0.56, ancho * 0.14, ancho * 0.30]))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<b>Lectura:</b> los resultados favorecen una propuesta centrada en diagnosticar, centralizar y "
        "automatizar la operación antes de vender IA como producto aislado.", styles["body"]))
    story.append(Paragraph(
        "<b>Advertencia metodológica:</b> la estructura temporal y textual del archivo sugiere datos simulados "
        "o altamente guiados. Los porcentajes describen esta base; no deben extrapolarse como estimaciones del "
        "mercado hondureño.", styles["small"]))
    story.append(PageBreak())

    story.append(Paragraph("Qué significa para ONDIGITAL", styles["h2"]))
    for titulo, cuerpo in [
        ("1. Vender diagnóstico, no catálogo.",
         "El mayor freno declarado es el desconocimiento sobre qué opciones existen. Esto favorece una venta "
         "consultiva: mapear el proceso, medir tiempo perdido, mostrar el costo del desorden y luego proponer "
         "la solución."),
        ("2. La arquitectura modular tiene sentido comercial.",
         "La pregunta abierta reparte la demanda entre tareas recurrentes, compras, consultas, reportes, "
         "planificación, garantías, agenda, proveedores, clientes, ventas, pagos, gastos, inventario y otros "
         "procesos. Eso coincide con una plataforma única por cliente construida sobre módulos reutilizables."),
        ("3. Business tiene una tesis clara.",
         f"{m['Quiere equipo externo']['pct']:.1f}% está interesado o definitivamente dispuesto a contar con un "
         "equipo tecnológico externo continuo. Hosting, backups, monitoreo, SSL y mantenimiento deben venderse "
         "como alivio operativo y continuidad, no como infraestructura por sí misma."),
        ("4. Vito debe llegar sobre datos ordenados.",
         "Los objetivos más repetidos son mejorar servicio, responder más rápido, centralizar información, "
         "ordenar el trabajo y tomar decisiones con datos. Primero se crea el sistema operacional; después Vito "
         "puede consultar, actuar y anticipar con información confiable."),
        ("5. El precio importa, pero no es la única objeción.",
         "El desconocimiento supera al costo como freno principal. Esto abre espacio para demostraciones, "
         "pilotos y paquetes escalonados: Starter, Business y Enterprise AI."),
    ]:
        story.append(Paragraph(f"<b>{titulo}</b> {cuerpo}", styles["body"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Segmentación comercial exploratoria", styles["h3"]))
    story.append(table_block(
        ["Segmento", "n", "% de la muestra"],
        [[bonito[k], str(int(seg[k])), f"{pct(int(seg[k])):.1f}%"] for k in orden_segmentos(seg)],
        [ancho * 0.56, ancho * 0.14, ancho * 0.30]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Los segmentos son reglas heurísticas para discusión comercial; no son un modelo predictivo validado.",
        styles["small"]))
    story.append(PageBreak())

    story.append(Paragraph("Infografía ejecutiva", styles["h2"]))
    story.append(Image(str(info_path), width=ancho, height=ancho * 7.6 / 13.0))
    story.append(PageBreak())

    paginas = [
        ("Madurez tecnológica", "01"), ("Tiempo perdido", "02"),
        ("Almacenamiento de información", "03"), ("Percepción de pérdida", "04"),
        ("Disposición a sistema a la medida", "05"), ("Frenos a la automatización", "06"),
        ("Equipo tecnológico externo", "07"), ("Aprendizaje de tecnología", "08"),
        ("Factores de decisión", "09"), ("Procesos prioritarios", "10"),
        ("Problemas operativos", "11"), ("Objetivos buscados", "12"),
        ("Madurez × disposición", "13"), ("Segmentos comerciales", "14"),
        ("Índice exploratorio de oportunidad", "15"),
    ]
    for index, (titulo, key) in enumerate(paginas):
        path = generated[key]
        with PILImage.open(path) as img:
            ratio = img.height / img.width
        story.append(Paragraph(titulo, styles["h3"]))
        story.append(Image(str(path), width=ancho, height=min(ancho * ratio, 108 * mm)))
        story.append(Spacer(1, 6))
        if index % 2 == 1 and index != len(paginas) - 1:
            story.append(PageBreak())
    story.append(PageBreak())

    story.append(Paragraph("Pregunta abierta: procesos, problemas y objetivos", styles["h2"]))
    story.append(Paragraph("Procesos más mencionados", styles["h3"]))
    story.append(table_block(
        ["Categoría", "n", "% de la muestra"],
        [[k, str(v), f"{pct(v):.1f}%"] for k, v in proceso.most_common(15)],
        [ancho * 0.56, ancho * 0.14, ancho * 0.30]))
    story.append(PageBreak())
    story.append(Paragraph("Problemas más mencionados", styles["h3"]))
    story.append(table_block(
        ["Categoría", "n", "% de la muestra"],
        [[k, str(v), f"{pct(v):.1f}%"] for k, v in problema.most_common(15)],
        [ancho * 0.56, ancho * 0.14, ancho * 0.30]))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Objetivos más mencionados", styles["h3"]))
    story.append(table_block(
        ["Categoría", "n", "% de la muestra"],
        [[k, str(v), f"{pct(v):.1f}%"] for k, v in objetivo.most_common(10)],
        [ancho * 0.56, ancho * 0.14, ancho * 0.30]))
    story.append(PageBreak())

    story.append(Paragraph("Metodología y calidad de los datos", styles["h2"]))
    calidad = metrics["calidad_datos"]
    for texto in [
        f"Se analizaron {n} registros y 10 preguntas. Las preguntas cerradas se resumieron por frecuencias y "
        "porcentajes. Las preguntas 3 y 9 son de multiselección: se separó por opción y el porcentaje se calcula "
        "sobre personas, no sobre menciones, por lo que sus categorías suman más de 100%.",
        f"La pregunta 10 se pudo descomponer en proceso, problema y objetivo. Las {calidad['q10_parseable_misma_plantilla']} "
        "respuestas siguieron exactamente la misma plantilla gramatical, lo que es una señal importante de datos "
        "generados o fuertemente guiados.",
        f"Se observaron {calidad['intervalos_consecutivos_mismo_segundo']} pares consecutivos registrados en el mismo "
        f"segundo y {calidad['intervalos_consecutivos_hasta_2_segundos']} con separación máxima de 2 segundos, sobre una "
        f"captura total de {calidad['duracion_captura_segundos']:.0f} segundos.",
        "Se calcularon asociaciones internas mediante la V de Cramér corregida por sesgo (nominal, sin signo) y "
        "correlaciones ordinales de Spearman (con signo). Por eso «madurez vs disposición» aparece dos veces con "
        "valores distintos: no es una contradicción, son dos medidas diferentes. La relación «almacenamiento vs "
        "percepción de pérdida» no cumple el supuesto de frecuencias esperadas del chi-cuadrado (20 de 35 celdas "
        "por debajo de 5) y solo debe leerse como indicio.",
        "Estos estadísticos describen la estructura de la base, pero no convierten una muestra no aleatoria o "
        "simulada en una muestra representativa.",
        f"El índice de oportunidad 0-100 es exploratorio (promedio {df[cols[17]].mean():.1f}). Combina baja madurez "
        "tecnológica, horas perdidas, percepción de pérdida, disposición al sistema, interés en equipo externo y "
        "disposición a aprender. No debe confundirse con una probabilidad de compra.",
    ]:
        story.append(Paragraph(texto, styles["body"]))
    story.append(Paragraph("Conclusión", styles["h3"]))
    story.append(Paragraph(
        "Como ejercicio de descubrimiento, la base ofrece una narrativa coherente para ONDIGITAL: existe dolor por "
        "desorganización y trabajo manual, existe apertura a herramientas y acompañamiento, y los procesos "
        "prioritarios son suficientemente diversos como para justificar una arquitectura modular. El siguiente "
        "paso de validación real sería repetir la encuesta con empresas identificadas por rubro y tamaño, "
        "registrar canal de captación y ubicación general, evitar respuestas generadas, y conectar interés con "
        "entrevistas o demostraciones.", styles["body"]))

    assert_winansi([f.text for f in story if isinstance(f, Paragraph)])
    pdf_path = build_pdf({"story": story})

    resueltas = ", ".join(
        f"{familia[0]} -> {Path(findfont(FontProperties(family=familia))).name}"
        for familia in (FONT_DISPLAY, FONT_BODY, FONT_MONO)
    )
    print(f"Tipografías resueltas: {resueltas}")
    print(f"Generados: {len(generated)} gráficos, infografia_resumen.png y {pdf_path.name} · {n} respuestas")


def orden_segmentos(seg: pd.Series) -> list[str]:
    return list(seg.index)


if __name__ == "__main__":
    sys.exit(main())
