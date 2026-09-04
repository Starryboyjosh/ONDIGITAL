// Generador de PDF mínimo con las catorce fuentes base (Helvetica), en
// milímetros y origen arriba-izquierda. Reemplaza github.com/go-pdf/fpdf con la
// misma superficie de llamadas que usaba internal/httpapi, para que el código de
// exportación se lea igual que el original.
//
// Solo se implementa lo que OnStock imprime: celdas con borde y relleno, texto
// alineado, saltos de página automáticos y una imagen en escala de grises para
// el código de barras de las etiquetas.

import zlib from 'node:zlib';

const K = 72 / 25.4; // puntos por milímetro

// ── Anchos de las fuentes base (unidades/1000 del cuerpo) ────────────────

const HELV = {
  32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556,
  64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556,
  96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278, 103: 556,
  104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556,
  111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556,
  118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334, 124: 260,
  125: 334, 126: 584,
  // Acentuadas y signos que aparecen en el copy en español (WinAnsi).
  133: 1000, 145: 222, 146: 222, 147: 333, 148: 333, 149: 350, 150: 556, 151: 1000,
  161: 333, 170: 370, 171: 556, 176: 400, 183: 278, 186: 365, 187: 556, 191: 611,
  193: 667, 201: 667, 205: 278, 209: 722, 211: 778, 218: 722, 220: 722,
  225: 556, 233: 556, 237: 278, 241: 556, 243: 556, 250: 556, 252: 556,
};

const HELV_B = {
  32: 278, 33: 333, 34: 474, 35: 556, 36: 556, 37: 889, 38: 722, 39: 238,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 333, 59: 333, 60: 584, 61: 584, 62: 584, 63: 611,
  64: 975, 65: 722, 66: 722, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 556, 75: 722, 76: 611, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 333, 92: 278, 93: 333, 94: 584, 95: 556,
  96: 333, 97: 556, 98: 611, 99: 556, 100: 611, 101: 556, 102: 333, 103: 611,
  104: 611, 105: 278, 106: 278, 107: 556, 108: 278, 109: 889, 110: 611,
  111: 611, 112: 611, 113: 611, 114: 389, 115: 556, 116: 333, 117: 611,
  118: 556, 119: 778, 120: 556, 121: 556, 122: 500, 123: 389, 124: 280,
  125: 389, 126: 584,
  133: 1000, 145: 278, 146: 278, 147: 500, 148: 500, 149: 350, 150: 556, 151: 1000,
  161: 333, 170: 370, 171: 556, 176: 400, 183: 278, 186: 365, 187: 556, 191: 611,
  193: 722, 201: 667, 205: 278, 209: 722, 211: 778, 218: 722, 220: 722,
  225: 556, 233: 556, 237: 278, 241: 611, 243: 611, 250: 611, 252: 611,
};

// Excepciones de cp1252 en el rango 0x80–0x9F, donde no coincide con Latin-1.
const CP1252_ALTOS = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

// cp1252 traduce el texto a WinAnsiEncoding, que es lo que hacía el
// UnicodeTranslatorFromDescriptor("") de fpdf.
export function cp1252(s) {
  const out = [];
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    if (c < 0x100 && !(c >= 0x80 && c <= 0x9f)) out.push(c);
    else if (CP1252_ALTOS.has(c)) out.push(CP1252_ALTOS.get(c));
    else out.push(0x3f); // "?"
  }
  return Buffer.from(out);
}

function esBold(style) { return String(style).toUpperCase().includes('B'); }
function esItalic(style) { return String(style).toUpperCase().includes('I'); }

function nombreFuente(style) {
  const b = esBold(style);
  const i = esItalic(style);
  if (b && i) return 'Helvetica-BoldOblique';
  if (b) return 'Helvetica-Bold';
  if (i) return 'Helvetica-Oblique';
  return 'Helvetica';
}

function anchoTexto(bytes, style, sizePt) {
  const tabla = esBold(style) ? HELV_B : HELV;
  let w = 0;
  for (const b of bytes) w += tabla[b] ?? 556;
  return (w * sizePt) / 1000 / K; // en milímetros
}

function esc(bytes) {
  const out = [];
  for (const b of bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c);
    out.push(b);
  }
  return Buffer.from(out);
}

const TAMANOS = {
  Letter: { P: [215.9, 279.4], L: [279.4, 215.9] },
};

export class PDF {
  // orientation: "P" | "L". Solo tamaño carta, que es lo único que imprime OnStock.
  constructor(orientation = 'P', size = 'Letter') {
    const o = String(orientation).toUpperCase().startsWith('L') ? 'L' : 'P';
    [this.w, this.h] = TAMANOS[size][o];
    this.lMargin = 10;
    this.rMargin = 10;
    this.tMargin = 10;
    this.bMargin = 20;
    this.autoBreak = true;
    this.pageBreakTrigger = this.h - this.bMargin;
    this.pages = [];
    this.buf = null;
    this.x = this.lMargin;
    this.y = this.tMargin;
    this.fontStyle = '';
    this.fontSizePt = 12;
    this.textColor = '0 0 0 rg';
    this.fillColor = '1 1 1 rg';
    this.drawColor = '0 0 0 RG';
    this.lineWidth = 0.2;
    this.images = new Map(); // nombre -> {w,h,data}
    this.usadas = new Set();
  }

  get fontSize() { return this.fontSizePt / K; }
  get cMargin() { return this.fontSize / 10; }

  setAutoPageBreak(on, margin) {
    this.autoBreak = on;
    this.bMargin = margin;
    this.pageBreakTrigger = this.h - margin;
  }

  setMargins(l, t, r = l) {
    this.lMargin = l;
    this.tMargin = t;
    this.rMargin = r;
  }

  addPage() {
    this.buf = [];
    this.pages.push(this.buf);
    this.x = this.lMargin;
    this.y = this.tMargin;
    this.buf.push(this.textColor, this.drawColor, `${this.lineWidth * K} w`);
    if (this.fontFamilySet) this.#emitFont();
  }

  #emitFont() {
    const name = nombreFuente(this.fontStyle);
    this.usadas.add(name);
    // Tf es un operador de estado de texto: vale fuera de BT/ET y persiste.
    this.buf.push(`/F-${name} ${this.fontSizePt.toFixed(2)} Tf`);
  }

  setFont(_family, style, sizePt) {
    this.fontFamilySet = true;
    this.fontStyle = style ?? '';
    if (sizePt) this.fontSizePt = sizePt;
    if (this.buf) this.#emitFont();
  }

  setFontSize(sizePt) { this.setFont('Helvetica', this.fontStyle, sizePt); }

  setTextColor(r, g, b) {
    this.textColor = `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg`;
    if (this.buf) this.buf.push(this.textColor);
  }

  setFillColor(r, g, b) {
    this.fillColor = `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg`;
  }

  setDrawColor(r, g, b) {
    this.drawColor = `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG`;
    if (this.buf) this.buf.push(this.drawColor);
  }

  setXY(x, y) { this.x = x; this.y = y; }
  setX(x) { this.x = x; }
  setY(y) { this.y = y; this.x = this.lMargin; }
  getY() { return this.y; }

  ln(h) {
    this.x = this.lMargin;
    this.y += h === undefined || h < 0 ? this.lastCellH ?? this.fontSize : h;
  }

  // cellFormat replica fpdf.CellFormat(w,h,txt,border,ln,align,fill).
  // border: "" | "1" | combinación de "T","B","L","R". ln: 0 sigue a la derecha,
  // 1 salta de línea, 2 baja pero mantiene la x.
  cellFormat(w, h, txt, border = '', ln = 0, align = 'L', fill = false) {
    if (this.autoBreak && this.y + h > this.pageBreakTrigger) {
      const x = this.x;
      this.addPage();
      this.x = x;
    }
    let ancho = w;
    if (ancho === 0) ancho = this.w - this.rMargin - this.x;

    const yTop = this.y;
    if (fill) {
      this.buf.push(this.fillColor);
      this.buf.push(`${(this.x * K).toFixed(2)} ${((this.h - yTop - h) * K).toFixed(2)} ${(ancho * K).toFixed(2)} ${(h * K).toFixed(2)} re f`);
      this.buf.push(this.textColor);
    }
    if (border) {
      const todo = border === '1';
      const has = (c) => todo || border.includes(c);
      const x0 = this.x * K;
      const x1 = (this.x + ancho) * K;
      const y0 = (this.h - yTop) * K;
      const y1 = (this.h - yTop - h) * K;
      const seg = [];
      if (has('L')) seg.push(`${x0.toFixed(2)} ${y0.toFixed(2)} m ${x0.toFixed(2)} ${y1.toFixed(2)} l S`);
      if (has('T')) seg.push(`${x0.toFixed(2)} ${y0.toFixed(2)} m ${x1.toFixed(2)} ${y0.toFixed(2)} l S`);
      if (has('R')) seg.push(`${x1.toFixed(2)} ${y0.toFixed(2)} m ${x1.toFixed(2)} ${y1.toFixed(2)} l S`);
      if (has('B')) seg.push(`${x0.toFixed(2)} ${y1.toFixed(2)} m ${x1.toFixed(2)} ${y1.toFixed(2)} l S`);
      if (seg.length) this.buf.push(...seg);
    }

    const s = String(txt ?? '');
    if (s !== '') {
      const bytes = cp1252(s);
      const tw = anchoTexto(bytes, this.fontStyle, this.fontSizePt);
      let dx;
      if (align === 'R') dx = ancho - this.cMargin - tw;
      else if (align === 'C') dx = (ancho - tw) / 2;
      else dx = this.cMargin;
      const bx = (this.x + dx) * K;
      const by = (this.h - (yTop + 0.5 * h + 0.3 * this.fontSize)) * K;
      this.buf.push(`BT ${bx.toFixed(2)} ${by.toFixed(2)} Td (${esc(bytes).toString('latin1')}) Tj ET`);
    }

    this.lastCellH = h;
    if (ln === 1) {
      this.x = this.lMargin;
      this.y = yTop + h;
    } else if (ln === 2) {
      this.y = yTop + h;
    } else {
      this.x += ancho;
    }
  }

  // multiCell parte el texto por ancho y escribe varias líneas.
  multiCell(w, h, txt, border = '', align = 'L', fill = false) {
    let ancho = w;
    if (ancho === 0) ancho = this.w - this.rMargin - this.x;
    const util = ancho - 2 * this.cMargin;
    const lineas = [];
    for (const parrafo of String(txt ?? '').split('\n')) {
      let actual = '';
      for (const palabra of parrafo.split(' ')) {
        const cand = actual === '' ? palabra : `${actual} ${palabra}`;
        if (anchoTexto(cp1252(cand), this.fontStyle, this.fontSizePt) > util && actual !== '') {
          lineas.push(actual);
          actual = palabra;
        } else {
          actual = cand;
        }
      }
      lineas.push(actual);
    }
    for (const l of lineas) this.cellFormat(ancho, h, l, border, 1, align, fill);
  }

  // registerImageGray registra un mapa de grises de 8 bits para dibujarlo luego.
  registerImageGray(name, pixels, w, h) {
    this.images.set(name, { w, h, data: zlib.deflateSync(pixels, { level: 9 }) });
  }

  // imageOptions dibuja una imagen registrada en x,y con ancho w y alto h (mm).
  imageOptions(name, x, y, w, h) {
    if (!this.images.has(name)) return;
    this.usadas.add(`IMG:${name}`);
    this.buf.push(
      'q',
      `${(w * K).toFixed(2)} 0 0 ${(h * K).toFixed(2)} ${(x * K).toFixed(2)} ${((this.h - y - h) * K).toFixed(2)} cm`,
      `/I-${name} Do`,
      'Q',
    );
  }

  // output serializa el documento completo.
  output() {
    const objetos = [];
    const push = (body) => {
      objetos.push(body);
      return objetos.length; // el número de objeto es 1-based
    };

    const fuentes = [...this.usadas].filter((n) => !n.startsWith('IMG:'));
    if (fuentes.length === 0) fuentes.push('Helvetica');
    const fontRefs = new Map();
    for (const f of fuentes) {
      const id = push(`<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`);
      fontRefs.set(f, id);
    }

    const imgRefs = new Map();
    for (const [name, img] of this.images) {
      const id = push({
        dict: `<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} `
          + '/ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode '
          + `/Length ${img.data.length} >>`,
        stream: img.data,
      });
      imgRefs.set(name, id);
    }

    const contenidos = [];
    for (const page of this.pages) {
      const raw = Buffer.from(page.join('\n'), 'latin1');
      const data = zlib.deflateSync(raw, { level: 9 });
      contenidos.push(push({
        dict: `<< /Filter /FlateDecode /Length ${data.length} >>`,
        stream: data,
      }));
    }

    const recursos = `<< /Font << ${[...fontRefs].map(([f, id]) => `/F-${f} ${id} 0 R`).join(' ')} >>`
      + (imgRefs.size ? ` /XObject << ${[...imgRefs].map(([n, id]) => `/I-${n} ${id} 0 R`).join(' ')} >>` : '')
      + ' /ProcSet [/PDF /Text /ImageB] >>';

    // Las páginas y su padre se referencian entre sí, así que se reservan los
    // números antes de escribir los cuerpos.
    const pagesID = objetos.length + 1;
    const pageIDs = this.pages.map((_, i) => pagesID + 1 + i);
    push(`<< /Type /Pages /Kids [${pageIDs.map((id) => `${id} 0 R`).join(' ')}] /Count ${this.pages.length} >>`);
    for (let i = 0; i < this.pages.length; i++) {
      push(`<< /Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${(this.w * K).toFixed(2)} ${(this.h * K).toFixed(2)}] `
        + `/Resources ${recursos} /Contents ${contenidos[i]} 0 R >>`);
    }
    const catalogID = push(`<< /Type /Catalog /Pages ${pagesID} 0 R >>`);

    const partes = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
    let offset = partes[0].length;
    const offsets = [0];
    for (let i = 0; i < objetos.length; i++) {
      offsets.push(offset);
      const o = objetos[i];
      let b;
      if (typeof o === 'string') {
        b = Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1');
      } else {
        b = Buffer.concat([
          Buffer.from(`${i + 1} 0 obj\n${o.dict}\nstream\n`, 'latin1'),
          o.stream,
          Buffer.from('\nendstream\nendobj\n', 'latin1'),
        ]);
      }
      partes.push(b);
      offset += b.length;
    }
    let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objetos.length; i++) {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogID} 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
    partes.push(Buffer.from(xref, 'latin1'));
    return Buffer.concat(partes);
  }
}
