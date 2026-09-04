// Traducción de internal/httpapi/barcode.go.
import { modulos, escalar } from '../lib/codigobarras.js';
import { encodeGray8 } from '../lib/png.js';
import { PDF } from '../lib/pdf.js';
import { writeErr, qInt, q } from './helpers.js';
import { fmtNum } from './exports.js';

function barcodeBitmap(code, w, h) {
  const bits = modulos(code);
  return { px: escalar(bits, w, h), w, h };
}

function barcodePNGBytes(code, w, h) {
  const bm = barcodeBitmap(code, w, h);
  return encodeGray8(bm.px, bm.w, bm.h);
}

// GET /api/barcode/{code} — PNG del código de barras.
export function barcodePNG(a, ctx) {
  const code = ctx.params.code.replace(/\.png$/, '');
  if (code === '') {
    writeErr(ctx.res, new Error('código vacío'));
    return;
  }
  let width = qInt(ctx.url, 'w');
  let height = qInt(ctx.url, 'h');
  if (width <= 0) width = 300;
  if (height <= 0) height = 80;
  let data;
  try {
    data = barcodePNGBytes(code, width, height);
  } catch (err) {
    writeErr(ctx.res, new Error(`no se pudo generar el código de barras: ${err.message}`));
    return;
  }
  ctx.res.writeHead(200, {
    'Content-Type': 'image/png',
    'Cache-Control': 'max-age=86400',
    'Content-Length': data.length,
  });
  ctx.res.end(data);
}

// GET /api/labels/pdf?ids=1,2,3&copies=2 — hoja de etiquetas con código de
// barras (carta, 3 columnas).
export function labelsPDF(a, ctx) {
  let copies = qInt(ctx.url, 'copies');
  if (copies <= 0) copies = 1;
  if (copies > 100) copies = 100;
  const ids = [];
  for (let part of q(ctx.url, 'ids').split(',')) {
    part = part.trim();
    if (part === '') continue;
    // fmt.Sscanf("%d") toma el prefijo numérico y descarta el resto.
    const m = /^[+-]?\d+/.exec(part);
    if (!m) continue;
    const id = Number.parseInt(m[0], 10);
    if (id > 0) ids.push(id);
  }
  if (ids.length === 0) {
    writeErr(ctx.res, new Error('indica al menos un producto (ids=1,2,3)'));
    return;
  }

  const settings = a.st.getSettings();
  let sym = settings.currency_symbol ?? '';
  if (sym === '') sym = 'L';

  const pdf = new PDF('P', 'Letter');
  pdf.setAutoPageBreak(false, 0);
  pdf.addPage();

  const marginX = 8.0;
  const marginY = 10.0;
  const cols = 3;
  const rowsPP = 9;
  const pageW = 215.9;
  const labelW = (pageW - 2 * marginX) / cols;
  const labelH = 28.0;

  let col = 0;
  let row = 0;
  let n = 0;
  for (const id of ids) {
    let p;
    try {
      p = a.st.getProduct(id);
    } catch {
      continue;
    }
    let code = p.barcode;
    if (code === '') code = p.sku;
    let bm;
    try {
      bm = barcodeBitmap(code, 360, 90);
    } catch {
      continue;
    }
    const imgName = `bc-${id}`;
    pdf.registerImageGray(imgName, bm.px, bm.w, bm.h);

    for (let c = 0; c < copies; c++) {
      if (row >= rowsPP) {
        pdf.addPage();
        row = 0;
        col = 0;
      }
      const x = marginX + col * labelW;
      const y = marginY + row * labelH;

      let name = p.name;
      const runas = [...name];
      if (runas.length > 38) name = `${runas.slice(0, 37).join('')}…`;
      pdf.setFont('Helvetica', 'B', 8);
      pdf.setXY(x + 2, y + 2);
      pdf.cellFormat(labelW - 4, 4, name, '', 0, 'C', false);

      pdf.imageOptions(imgName, x + labelW / 2 - 22, y + 7, 44, 11);

      pdf.setFont('Helvetica', '', 7);
      pdf.setXY(x + 2, y + 18.5);
      pdf.cellFormat(labelW - 4, 3.5, code, '', 0, 'C', false);

      pdf.setFont('Helvetica', 'B', 9);
      pdf.setXY(x + 2, y + 22.5);
      pdf.cellFormat(labelW - 4, 4, `${sym} ${fmtNum(p.price)}`, '', 0, 'C', false);

      col++;
      if (col >= cols) {
        col = 0;
        row++;
      }
      n++;
    }
  }
  if (n === 0) {
    writeErr(ctx.res, new Error('ningún producto válido para etiquetas'));
    return;
  }
  const body = pdf.output();
  ctx.res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="etiquetas.pdf"',
    'Content-Length': body.length,
  });
  ctx.res.end(body);
}
