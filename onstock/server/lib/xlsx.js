// Escritor XLSX mínimo. Reemplaza github.com/xuri/excelize con la misma
// superficie de llamadas que usaban las exportaciones (newStyle, setCellValue,
// setCellStyle, setColWidth), para que exports.js se lea como el original.
//
// Un .xlsx es un ZIP de XML: aquí se arma a mano con node:zlib, sin npm.
import { zip } from './zip.js';

export function columnName(n) {
  let s = '';
  let k = n;
  while (k > 0) {
    const r = (k - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    k = Math.floor((k - 1) / 26);
  }
  return s;
}

// coordinatesToCellName(col, row) con col y row 1-based, como en excelize.
export function coordinatesToCellName(col, row) {
  return `${columnName(col)}${row}`;
}

function xmlEscape(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    // XML 1.0 no admite los caracteres de control; se quitan para no producir
    // un archivo que Excel rechace al abrir.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function parseRef(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`referencia de celda inválida: ${ref}`);
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]) };
}

export class Workbook {
  constructor(sheetName = 'Sheet1') {
    this.sheet = sheetName;
    this.cells = new Map(); // "col,row" -> {v, t, s}
    this.cols = []; // {min, max, width}
    this.numFmts = new Map(); // código -> id
    this.nextNumFmtID = 164;
    this.fonts = ['<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>'];
    this.fills = [
      '<fill><patternFill patternType="none"/></fill>',
      '<fill><patternFill patternType="gray125"/></fill>',
    ];
    this.borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
    this.xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  }

  setSheetName(_old, nuevo) {
    this.sheet = nuevo;
  }

  setColWidth(_sheet, from, to, width) {
    const a = parseRef(`${from}1`).col;
    const b = parseRef(`${to}1`).col;
    this.cols.push({ min: Math.min(a, b), max: Math.max(a, b), width });
  }

  // newStyle({font:{bold,size,color}, fill:{color}, border:[{type,style,color}], numFmt})
  // devuelve el índice del estilo, igual que excelize.
  newStyle(st = {}) {
    let fontId = 0;
    if (st.font) {
      const f = st.font;
      let xml = '<font>';
      if (f.bold) xml += '<b/>';
      if (f.italic) xml += '<i/>';
      xml += `<sz val="${f.size ?? 11}"/>`;
      xml += f.color ? `<color rgb="FF${f.color}"/>` : '<color theme="1"/>';
      xml += '<name val="Calibri"/><family val="2"/></font>';
      fontId = this.fonts.length;
      this.fonts.push(xml);
    }
    let fillId = 0;
    if (st.fill && st.fill.color) {
      fillId = this.fills.length;
      this.fills.push(
        `<fill><patternFill patternType="solid"><fgColor rgb="FF${st.fill.color}"/><bgColor indexed="64"/></patternFill></fill>`,
      );
    }
    let borderId = 0;
    if (st.border && st.border.length) {
      const lados = { left: '', right: '', top: '', bottom: '' };
      for (const b of st.border) {
        const estilo = { 1: 'thin', 2: 'medium', 6: 'double' }[b.style] ?? 'thin';
        lados[b.type] = `<${b.type} style="${estilo}"><color rgb="FF${b.color ?? '000000'}"/></${b.type}>`;
      }
      borderId = this.borders.length;
      this.borders.push(
        `<border>${lados.left || '<left/>'}${lados.right || '<right/>'}`
        + `${lados.top || '<top/>'}${lados.bottom || '<bottom/>'}<diagonal/></border>`,
      );
    }
    let numFmtId = 0;
    if (st.numFmt) {
      if (!this.numFmts.has(st.numFmt)) {
        this.numFmts.set(st.numFmt, this.nextNumFmtID++);
      }
      numFmtId = this.numFmts.get(st.numFmt);
    }
    const idx = this.xfs.length;
    this.xfs.push(
      `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"`
      + `${fontId ? ' applyFont="1"' : ''}${fillId ? ' applyFill="1"' : ''}`
      + `${borderId ? ' applyBorder="1"' : ''}${numFmtId ? ' applyNumberFormat="1"' : ''}/>`,
    );
    return idx;
  }

  setCellValue(_sheet, ref, value) {
    const { col, row } = parseRef(ref);
    const key = `${col},${row}`;
    const prev = this.cells.get(key);
    const cell = { col, row, s: prev ? prev.s : 0 };
    if (typeof value === 'number' && Number.isFinite(value)) {
      cell.t = 'n';
      cell.v = value;
    } else if (typeof value === 'boolean') {
      cell.t = 'b';
      cell.v = value ? 1 : 0;
    } else {
      cell.t = 's';
      cell.v = String(value ?? '');
    }
    this.cells.set(key, cell);
  }

  // setCellStyle aplica el estilo a todo el rectángulo from..to.
  setCellStyle(_sheet, from, to, styleID) {
    const a = parseRef(from);
    const b = parseRef(to);
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
      for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
        const key = `${c},${r}`;
        const cell = this.cells.get(key) ?? { col: c, row: r, t: 's', v: '' };
        cell.s = styleID;
        this.cells.set(key, cell);
      }
    }
  }

  #sheetXML() {
    const porFila = new Map();
    for (const cell of this.cells.values()) {
      if (!porFila.has(cell.row)) porFila.set(cell.row, []);
      porFila.get(cell.row).push(cell);
    }
    const filas = [...porFila.keys()].sort((a, b) => a - b);
    let sd = '';
    for (const r of filas) {
      const celdas = porFila.get(r).sort((a, b) => a.col - b.col);
      sd += `<row r="${r}">`;
      for (const c of celdas) {
        const ref = `${columnName(c.col)}${c.row}`;
        const s = c.s ? ` s="${c.s}"` : '';
        if (c.t === 'n') {
          sd += `<c r="${ref}"${s}><v>${c.v}</v></c>`;
        } else if (c.t === 'b') {
          sd += `<c r="${ref}"${s} t="b"><v>${c.v}</v></c>`;
        } else if (c.v === '') {
          sd += `<c r="${ref}"${s}/>`;
        } else {
          sd += `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(c.v)}</t></is></c>`;
        }
      }
      sd += '</row>';
    }
    const cols = this.cols.length
      ? `<cols>${this.cols.map((c) => `<col min="${c.min}" max="${c.max}" width="${c.width}" customWidth="1"/>`).join('')}</cols>`
      : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + `${cols}<sheetData>${sd}</sheetData></worksheet>`;
  }

  #stylesXML() {
    const numFmts = [...this.numFmts].map(([code, id]) => `<numFmt numFmtId="${id}" formatCode="${xmlEscape(code)}"/>`).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + (numFmts ? `<numFmts count="${this.numFmts.size}">${numFmts}</numFmts>` : '')
      + `<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts>`
      + `<fills count="${this.fills.length}">${this.fills.join('')}</fills>`
      + `<borders count="${this.borders.length}">${this.borders.join('')}</borders>`
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>`
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
      + '</styleSheet>';
  }

  // write serializa el libro completo a un Buffer.
  write() {
    return zip([
      {
        name: '[Content_Types].xml',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
          + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
          + '<Default Extension="xml" ContentType="application/xml"/>'
          + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
          + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
          + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
          + '</Types>',
      },
      {
        name: '_rels/.rels',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
          + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
          + '</Relationships>',
      },
      {
        name: 'xl/workbook.xml',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
          + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
          + `<sheets><sheet name="${xmlEscape(this.sheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
          + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
          + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
          + '</Relationships>',
      },
      { name: 'xl/worksheets/sheet1.xml', data: this.#sheetXML() },
      { name: 'xl/styles.xml', data: this.#stylesXML() },
    ]);
  }
}
