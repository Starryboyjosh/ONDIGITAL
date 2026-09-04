// Traducción de internal/httpapi/exports.go.
// El XLSX y el PDF se arman con los escritores propios de server/lib, sin npm.
import { PDF } from '../lib/pdf.js';
import { Workbook, coordinatesToCellName } from '../lib/xlsx.js';
import { q, qInt } from './helpers.js';
import { reportRange } from './handlers.js';
import { ymd, dmyHm, MESES_ES } from '../lib/fechas.js';

// fmtNum formatea 1234567.5 como "1,234,567.50".
export function fmtNum(v) {
  let x = v;
  const neg = x < 0;
  if (neg) x = -x;
  const s = x.toFixed(2);
  const [intPart, dec] = s.split('.');
  let b = '';
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) b += ',';
    b += intPart[i];
  }
  const out = `${b}.${dec}`;
  return neg ? `-${out}` : out;
}

// pct imita %.1f de Go para los márgenes.
function pct(v) { return v.toFixed(1); }

// pct0 imita %.0f, usado en "(-) ISR estimado (25%)".
function pct0(v) { return v.toFixed(0); }

function company(st) {
  const s = st.getSettings();
  let name = s.company_name ?? '';
  const rtn = s.company_rtn ?? '';
  let sym = s.currency_symbol ?? '';
  if (name === '') name = 'Mi Empresa';
  if (sym === '') sym = 'L';
  return [name, rtn, sym];
}

function sendXLSX(res, filename, f) {
  const body = f.write();
  res.writeHead(200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': body.length,
  });
  res.end(body);
}

function sendPDF(res, filename, pdf) {
  const body = pdf.output();
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': body.length,
  });
  res.end(body);
}

// newPDF crea un PDF carta con encabezado de la empresa.
function newPDF(orientation, companyName, rtn, title, subtitle) {
  const pdf = new PDF(orientation, 'Letter');
  pdf.setAutoPageBreak(true, 18);
  pdf.addPage();
  pdf.setFont('Helvetica', 'B', 15);
  pdf.setTextColor(20, 24, 46);
  pdf.cellFormat(0, 8, companyName, '', 1, 'C', false);
  if (rtn !== '') {
    pdf.setFont('Helvetica', '', 9);
    pdf.setTextColor(110, 110, 120);
    pdf.cellFormat(0, 5, `RTN: ${rtn}`, '', 1, 'C', false);
  }
  pdf.setFont('Helvetica', 'B', 12);
  pdf.setTextColor(20, 24, 46);
  pdf.cellFormat(0, 8, title, '', 1, 'C', false);
  if (subtitle !== '') {
    pdf.setFont('Helvetica', '', 10);
    pdf.setTextColor(110, 110, 120);
    pdf.cellFormat(0, 5, subtitle, '', 1, 'C', false);
  }
  pdf.ln(4);
  pdf.setTextColor(0, 0, 0);
  return pdf;
}

// ── Estado de Resultados ────────────────────────────────

// neg devuelve el monto con signo contrario, pero deja el cero en cero: sin
// esto una línea sin movimiento se imprimía como "-0.00".
function neg(v) { return v === 0 ? 0 : -v; }

function incomeStatementRows(st) {
  return [
    { label: 'INGRESOS', kind: 'section' },
    { label: 'Ventas brutas', value: st.ventas_brutas, indent: true },
    { label: '(-) Descuentos y rebajas', value: neg(st.descuentos), indent: true },
    { label: 'Ventas netas', value: st.ventas_netas, kind: 'sub' },
    { label: '(-) Costo de ventas', value: neg(st.costo_ventas), indent: true },
    { label: 'UTILIDAD BRUTA', value: st.utilidad_bruta, kind: 'total' },
    { label: 'GASTOS DE OPERACIÓN', kind: 'section' },
    { label: 'Gastos de venta', value: neg(st.gastos_ventas), indent: true },
    { label: 'Gastos administrativos', value: neg(st.gastos_administrativos), indent: true },
    { label: 'Total gastos de operación', value: neg(st.gastos_operativos), kind: 'sub' },
    { label: 'UTILIDAD DE OPERACIÓN', value: st.utilidad_operativa, kind: 'total' },
    { label: 'Gastos financieros', value: neg(st.gastos_financieros), indent: true },
    { label: 'Otros gastos', value: neg(st.otros_gastos), indent: true },
    { label: 'UTILIDAD ANTES DE ISR', value: st.utilidad_antes_isr, kind: 'total' },
    { label: `(-) ISR estimado (${pct0(st.isr_rate)}%)`, value: neg(st.isr), indent: true },
    { label: 'UTILIDAD NETA', value: st.utilidad_neta, kind: 'final' },
  ];
}

export function exportIncomeStatement(a, ctx) {
  const [from, to] = reportRange(ctx.url);
  const st = a.st.incomeStatement(from, to);
  const [name, rtn, sym] = company(a.st);
  const period = `Del ${from} al ${to}`;
  const rows = incomeStatementRows(st);

  if (q(ctx.url, 'format') === 'pdf') {
    const pdf = newPDF('P', name, rtn, 'Estado de Resultados', `${period}  ·  Cifras en ${sym} (netas de ISV)`);
    for (const row of rows) {
      if (row.kind === 'section') {
        pdf.ln(2);
        pdf.setFont('Helvetica', 'B', 10);
        pdf.setTextColor(70, 80, 180);
        pdf.cellFormat(0, 7, row.label, '', 1, 'L', false);
        pdf.setTextColor(0, 0, 0);
        continue;
      }
      switch (row.kind) {
        case 'total': pdf.setFont('Helvetica', 'B', 10); break;
        case 'final': pdf.setFont('Helvetica', 'B', 11); break;
        case 'sub': pdf.setFont('Helvetica', 'B', 10); break;
        default: pdf.setFont('Helvetica', '', 10); break;
      }
      let label = row.label;
      if (row.indent) label = `    ${label}`;
      let border = '';
      if (row.kind === 'total' || row.kind === 'sub') border = 'T';
      if (row.kind === 'final') {
        border = 'TB';
        pdf.setFillColor(238, 240, 252);
      }
      const relleno = row.kind === 'final';
      pdf.cellFormat(130, 7, label, border, 0, 'L', relleno);
      pdf.cellFormat(0, 7, `${sym} ${fmtNum(row.value)}`, border, 1, 'R', relleno);
    }
    pdf.ln(6);
    pdf.setFont('Helvetica', 'I', 8);
    pdf.setTextColor(120, 120, 130);
    pdf.multiCell(0, 4,
      `Notas: ventas y costos netos de ISV. ISV cobrado en el período (débito fiscal): ${sym} ${fmtNum(st.isv_cobrado)}. `
      + `Ventas registradas: ${st.num_ventas}. `
      + `Margen bruto: ${pct(st.margen_bruto)}% · Margen neto: ${pct(st.margen_neto)}%. `
      + `El ISR es una estimación (${pct0(st.isr_rate)}%) y no sustituye el cálculo fiscal oficial.`,
      '', 'L', false);
    pdf.setFont('Helvetica', '', 8);
    pdf.cellFormat(0, 8, `Generado el ${dmyHm(new Date())}`, '', 1, 'L', false);
    sendPDF(ctx.res, `estado_resultados_${from}_${to}.pdf`, pdf);
    return;
  }

  // Excel
  const f = new Workbook();
  const sheet = 'Estado de Resultados';
  f.setSheetName('Sheet1', sheet);
  f.setColWidth(sheet, 'A', 'A', 42);
  f.setColWidth(sheet, 'B', 'B', 18);

  const numFmt = '#,##0.00';
  const titleStyle = f.newStyle({ font: { bold: true, size: 14 } });
  const subStyle = f.newStyle({ font: { size: 10, color: '666677' } });
  const sectionStyle = f.newStyle({ font: { bold: true, color: '4650B4' } });
  const moneyStyle = f.newStyle({ numFmt });
  const boldMoney = f.newStyle({
    font: { bold: true }, numFmt, border: [{ type: 'top', style: 1, color: '999999' }],
  });
  const finalStyle = f.newStyle({
    font: { bold: true, size: 12 }, numFmt, fill: { color: 'EEF0FC' },
    border: [{ type: 'top', style: 2, color: '4650B4' }, { type: 'bottom', style: 6, color: '4650B4' }],
  });
  const boldLabel = f.newStyle({
    font: { bold: true }, border: [{ type: 'top', style: 1, color: '999999' }],
  });
  const finalLabel = f.newStyle({
    font: { bold: true, size: 12 }, fill: { color: 'EEF0FC' },
    border: [{ type: 'top', style: 2, color: '4650B4' }, { type: 'bottom', style: 6, color: '4650B4' }],
  });

  f.setCellValue(sheet, 'A1', name);
  f.setCellStyle(sheet, 'A1', 'A1', titleStyle);
  if (rtn !== '') {
    f.setCellValue(sheet, 'A2', `RTN: ${rtn}`);
    f.setCellStyle(sheet, 'A2', 'A2', subStyle);
  }
  f.setCellValue(sheet, 'A3', 'ESTADO DE RESULTADOS');
  f.setCellStyle(sheet, 'A3', 'A3', titleStyle);
  f.setCellValue(sheet, 'A4', `${period}  ·  Cifras en ${sym} (netas de ISV)`);
  f.setCellStyle(sheet, 'A4', 'A4', subStyle);

  let rowNum = 6;
  for (const row of rows) {
    const cellA = `A${rowNum}`;
    const cellB = `B${rowNum}`;
    if (row.kind === 'section') {
      f.setCellValue(sheet, cellA, row.label);
      f.setCellStyle(sheet, cellA, cellA, sectionStyle);
      rowNum++;
      continue;
    }
    let label = row.label;
    if (row.indent) label = `    ${label}`;
    f.setCellValue(sheet, cellA, label);
    f.setCellValue(sheet, cellB, row.value);
    switch (row.kind) {
      case 'total':
      case 'sub':
        f.setCellStyle(sheet, cellA, cellA, boldLabel);
        f.setCellStyle(sheet, cellB, cellB, boldMoney);
        break;
      case 'final':
        f.setCellStyle(sheet, cellA, cellA, finalLabel);
        f.setCellStyle(sheet, cellB, cellB, finalStyle);
        break;
      default:
        f.setCellStyle(sheet, cellB, cellB, moneyStyle);
        break;
    }
    rowNum++;
  }
  rowNum += 2;
  const notes = [
    `ISV cobrado en el período (débito fiscal): ${sym} ${fmtNum(st.isv_cobrado)}`,
    `Ventas registradas: ${st.num_ventas} · Margen bruto: ${pct(st.margen_bruto)}% · Margen neto: ${pct(st.margen_neto)}%`,
    `El ISR es una estimación (${pct0(st.isr_rate)}%) y no sustituye el cálculo fiscal oficial.`,
    `Generado el ${dmyHm(new Date())}`,
  ];
  for (const n of notes) {
    const cell = `A${rowNum}`;
    f.setCellValue(sheet, cell, n);
    f.setCellStyle(sheet, cell, cell, subStyle);
    rowNum++;
  }
  sendXLSX(ctx.res, `estado_resultados_${from}_${to}.xlsx`, f);
}

// ── Resumen mensual ─────────────────────────────────────

export function exportMonthlySummary(a, ctx) {
  let year = qInt(ctx.url, 'year');
  let month = qInt(ctx.url, 'month');
  const now = new Date();
  if (year === 0) year = now.getFullYear();
  if (month < 1 || month > 12) month = now.getMonth() + 1;
  const ms = a.st.monthlySummary(year, month);
  const [name, rtn, sym] = company(a.st);
  const st = ms.statement;
  const period = `${MESES_ES[month - 1]} ${year}`;

  const kpis = [
    ['Ventas netas', `${sym} ${fmtNum(st.ventas_netas)}`],
    ['Costo de ventas', `${sym} ${fmtNum(st.costo_ventas)}`],
    ['Utilidad bruta', `${sym} ${fmtNum(st.utilidad_bruta)}`],
    ['Gastos de operación', `${sym} ${fmtNum(st.gastos_operativos)}`],
    ['Utilidad neta (estimada)', `${sym} ${fmtNum(st.utilidad_neta)}`],
    ['ISV cobrado (débito fiscal)', `${sym} ${fmtNum(st.isv_cobrado)}`],
    ['Número de ventas', `${st.num_ventas}`],
    ['Ticket promedio', `${sym} ${fmtNum(ms.ticket_promedio)}`],
    ['Compras recibidas', `${sym} ${fmtNum(ms.compras_recibidas)} (${ms.num_compras} órdenes)`],
    ['Valor actual del inventario', `${sym} ${fmtNum(ms.valor_inventario)}`],
    ['Margen bruto', `${pct(st.margen_bruto)}%`],
    ['Margen neto', `${pct(st.margen_neto)}%`],
  ];

  if (q(ctx.url, 'format') === 'pdf') {
    const pdf = newPDF('P', name, rtn, 'Resumen Mensual', period);
    pdf.setFont('Helvetica', 'B', 11);
    pdf.cellFormat(0, 7, 'Indicadores del mes', '', 1, 'L', false);
    pdf.setFont('Helvetica', '', 10);
    kpis.forEach((kpi, i) => {
      const fill = i % 2 === 0;
      pdf.setFillColor(246, 247, 251);
      pdf.cellFormat(110, 7, kpi[0], '', 0, 'L', fill);
      pdf.cellFormat(0, 7, kpi[1], '', 1, 'R', fill);
    });
    pdf.ln(5);
    pdf.setFont('Helvetica', 'B', 11);
    pdf.cellFormat(0, 7, 'Productos más vendidos', '', 1, 'L', false);
    pdf.setFont('Helvetica', 'B', 9);
    pdf.setFillColor(70, 80, 180);
    pdf.setTextColor(255, 255, 255);
    pdf.cellFormat(75, 7, 'Producto', '1', 0, 'L', true);
    pdf.cellFormat(30, 7, 'SKU', '1', 0, 'L', true);
    pdf.cellFormat(22, 7, 'Cantidad', '1', 0, 'R', true);
    pdf.cellFormat(35, 7, 'Ventas netas', '1', 0, 'R', true);
    pdf.cellFormat(0, 7, 'Utilidad', '1', 1, 'R', true);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('Helvetica', '', 9);
    for (const t of ms.top_products) {
      pdf.cellFormat(75, 6.5, recortar(t.name, 42), '1', 0, 'L', false);
      pdf.cellFormat(30, 6.5, t.sku, '1', 0, 'L', false);
      pdf.cellFormat(22, 6.5, fmtNum(t.qty), '1', 0, 'R', false);
      pdf.cellFormat(35, 6.5, `${sym} ${fmtNum(t.revenue)}`, '1', 0, 'R', false);
      pdf.cellFormat(0, 6.5, `${sym} ${fmtNum(t.profit)}`, '1', 1, 'R', false);
    }
    pdf.ln(6);
    pdf.setFont('Helvetica', 'I', 8);
    pdf.setTextColor(120, 120, 130);
    pdf.cellFormat(0, 5, `Generado el ${dmyHm(new Date())}`, '', 1, 'L', false);
    sendPDF(ctx.res, `resumen_${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}.pdf`, pdf);
    return;
  }

  const f = new Workbook();
  const sheet = 'Resumen';
  f.setSheetName('Sheet1', sheet);
  f.setColWidth(sheet, 'A', 'A', 38);
  f.setColWidth(sheet, 'B', 'E', 18);
  const numFmt = '#,##0.00';
  const titleStyle = f.newStyle({ font: { bold: true, size: 14 } });
  const subStyle = f.newStyle({ font: { size: 10, color: '666677' } });
  const headStyle = f.newStyle({ font: { bold: true, color: 'FFFFFF' }, fill: { color: '4650B4' } });
  const moneyStyle = f.newStyle({ numFmt });

  f.setCellValue(sheet, 'A1', name);
  f.setCellStyle(sheet, 'A1', 'A1', titleStyle);
  f.setCellValue(sheet, 'A2', `RESUMEN MENSUAL — ${period}`);
  f.setCellStyle(sheet, 'A2', 'A2', titleStyle);
  if (rtn !== '') {
    f.setCellValue(sheet, 'A3', `RTN: ${rtn}`);
    f.setCellStyle(sheet, 'A3', 'A3', subStyle);
  }
  let rowNum = 5;
  for (const kpi of kpis) {
    f.setCellValue(sheet, `A${rowNum}`, kpi[0]);
    f.setCellValue(sheet, `B${rowNum}`, kpi[1]);
    rowNum++;
  }
  rowNum += 1;
  f.setCellValue(sheet, `A${rowNum}`, 'PRODUCTOS MÁS VENDIDOS');
  f.setCellStyle(sheet, `A${rowNum}`, `A${rowNum}`, titleStyle);
  rowNum++;
  const headers = ['Producto', 'SKU', 'Cantidad', 'Ventas netas', 'Utilidad'];
  headers.forEach((h, i) => {
    const cell = coordinatesToCellName(i + 1, rowNum);
    f.setCellValue(sheet, cell, h);
    f.setCellStyle(sheet, cell, cell, headStyle);
  });
  rowNum++;
  for (const t of ms.top_products) {
    f.setCellValue(sheet, `A${rowNum}`, t.name);
    f.setCellValue(sheet, `B${rowNum}`, t.sku);
    f.setCellValue(sheet, `C${rowNum}`, t.qty);
    f.setCellValue(sheet, `D${rowNum}`, t.revenue);
    f.setCellValue(sheet, `E${rowNum}`, t.profit);
    f.setCellStyle(sheet, `C${rowNum}`, `E${rowNum}`, moneyStyle);
    rowNum++;
  }
  sendXLSX(ctx.res, `resumen_${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}.xlsx`, f);
}

// ── Inventario ──────────────────────────────────────────

export function exportInventory(a, ctx) {
  const products = a.st.listProducts({ inactive: q(ctx.url, 'inactive') === '1' });
  const [name, rtn, sym] = company(a.st);
  const today = ymd(new Date());
  let totalValue = 0;
  for (const p of products) totalValue += p.stock * p.cost;

  if (q(ctx.url, 'format') === 'pdf') {
    const pdf = newPDF('L', name, rtn, 'Inventario de Productos',
      `Al ${today} · ${products.length} productos · Valor total: ${sym} ${fmtNum(totalValue)}`);
    pdf.setFont('Helvetica', 'B', 8);
    pdf.setFillColor(70, 80, 180);
    pdf.setTextColor(255, 255, 255);
    const widths = [28, 78, 32, 40, 22, 22, 18, 18, 24];
    const heads = ['SKU', 'Producto', 'Categoría', 'Proveedor', 'Costo', 'Precio', 'Stock', 'Mínimo', 'Valor'];
    const aligns = ['L', 'L', 'L', 'L', 'R', 'R', 'R', 'R', 'R'];
    heads.forEach((h, i) => pdf.cellFormat(widths[i], 7, h, '1', 0, aligns[i], true));
    pdf.ln(-1);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('Helvetica', '', 8);
    let fill = false;
    for (const p of products) {
      pdf.setFillColor(246, 247, 251);
      const cells = [p.sku, recortar(p.name, 48), p.category_name, p.supplier_name,
        fmtNum(p.cost), fmtNum(p.price), fmtNum(p.stock), fmtNum(p.min_stock), fmtNum(p.stock * p.cost)];
      cells.forEach((c, i) => pdf.cellFormat(widths[i], 6, c, '1', 0, aligns[i], fill));
      pdf.ln(-1);
      fill = !fill;
    }
    sendPDF(ctx.res, `inventario_${today}.pdf`, pdf);
    return;
  }

  const f = new Workbook();
  const sheet = 'Inventario';
  f.setSheetName('Sheet1', sheet);
  const widths = { A: 16, B: 18, C: 40, D: 18, E: 24, F: 12, G: 12, H: 10, I: 10, J: 14, K: 10 };
  for (const [col, wd] of Object.entries(widths)) f.setColWidth(sheet, col, col, wd);
  const numFmt = '#,##0.00';
  const titleStyle = f.newStyle({ font: { bold: true, size: 14 } });
  const headStyle = f.newStyle({ font: { bold: true, color: 'FFFFFF' }, fill: { color: '4650B4' } });
  const moneyStyle = f.newStyle({ numFmt });

  f.setCellValue(sheet, 'A1', `${name} — Inventario al ${today}`);
  f.setCellStyle(sheet, 'A1', 'A1', titleStyle);
  const headers = ['SKU', 'Código de barras', 'Producto', 'Categoría', 'Proveedor', 'Costo', 'Precio',
    'ISV %', 'Stock', 'Stock mínimo', 'Valor', 'Activo'];
  headers.forEach((h, i) => {
    const cell = coordinatesToCellName(i + 1, 3);
    f.setCellValue(sheet, cell, h);
    f.setCellStyle(sheet, cell, cell, headStyle);
  });
  let rowNum = 4;
  for (const p of products) {
    const vals = [p.sku, p.barcode, p.name, p.category_name, p.supplier_name, p.cost, p.price,
      p.isv_rate, p.stock, p.min_stock, p.stock * p.cost, p.active ? 'Sí' : 'No'];
    vals.forEach((v, i) => f.setCellValue(sheet, coordinatesToCellName(i + 1, rowNum), v));
    f.setCellStyle(sheet, `F${rowNum}`, `K${rowNum}`, moneyStyle);
    rowNum++;
  }
  const boldMoney = f.newStyle({ font: { bold: true }, numFmt });
  f.setCellValue(sheet, `C${rowNum + 1}`, 'VALOR TOTAL DEL INVENTARIO');
  f.setCellValue(sheet, `K${rowNum + 1}`, totalValue);
  f.setCellStyle(sheet, `K${rowNum + 1}`, `K${rowNum + 1}`, boldMoney);
  sendXLSX(ctx.res, `inventario_${today}.xlsx`, f);
}

// ── Ventas ──────────────────────────────────────────────

export function exportSales(a, ctx) {
  const [from, to] = reportRange(ctx.url);
  const sales = a.st.salesReportRows(from, to);
  const [name, rtn, sym] = company(a.st);
  let totNet = 0;
  let totISV = 0;
  let totTotal = 0;
  let totCost = 0;
  for (const v of sales) {
    if (v.status !== 'completada') continue;
    totNet += v.subtotal;
    totISV += v.isv;
    totTotal += v.total;
    totCost += v.cost_total;
  }

  if (q(ctx.url, 'format') === 'pdf') {
    const pdf = newPDF('L', name, rtn, 'Reporte de Ventas', `Del ${from} al ${to}`);
    const widths = [24, 32, 60, 26, 28, 24, 28, 22, 18];
    const heads = ['Número', 'Fecha', 'Cliente', 'Subtotal', 'ISV', 'Total', 'Utilidad', 'Pago', 'Estado'];
    const aligns = ['L', 'L', 'L', 'R', 'R', 'R', 'R', 'L', 'L'];
    pdf.setFont('Helvetica', 'B', 8);
    pdf.setFillColor(70, 80, 180);
    pdf.setTextColor(255, 255, 255);
    heads.forEach((h, i) => pdf.cellFormat(widths[i], 7, h, '1', 0, aligns[i], true));
    pdf.ln(-1);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('Helvetica', '', 8);
    let fill = false;
    for (const v of sales) {
      pdf.setFillColor(246, 247, 251);
      let cliente = v.customer_name;
      if (cliente === '') cliente = 'Consumidor final';
      cliente = recortar(cliente, 36);
      let utilidad = v.subtotal - v.cost_total;
      if (v.status !== 'completada') utilidad = 0;
      const cells = [v.sale_number, v.sale_date, cliente, fmtNum(v.subtotal), fmtNum(v.isv),
        fmtNum(v.total), fmtNum(utilidad), v.payment_method, v.status];
      cells.forEach((c, i) => pdf.cellFormat(widths[i], 6, c, '1', 0, aligns[i], fill));
      pdf.ln(-1);
      fill = !fill;
    }
    pdf.setFont('Helvetica', 'B', 8);
    pdf.cellFormat(widths[0] + widths[1] + widths[2], 7, 'TOTALES (ventas completadas)', '1', 0, 'L', false);
    pdf.cellFormat(widths[3], 7, fmtNum(totNet), '1', 0, 'R', false);
    pdf.cellFormat(widths[4], 7, fmtNum(totISV), '1', 0, 'R', false);
    pdf.cellFormat(widths[5], 7, fmtNum(totTotal), '1', 0, 'R', false);
    pdf.cellFormat(widths[6], 7, fmtNum(totNet - totCost), '1', 0, 'R', false);
    pdf.cellFormat(widths[7] + widths[8], 7, '', '1', 1, 'L', false);
    sendPDF(ctx.res, `ventas_${from}_${to}.pdf`, pdf);
    return;
  }

  const f = new Workbook();
  const sheet = 'Ventas';
  f.setSheetName('Sheet1', sheet);
  const widths = { A: 12, B: 20, C: 30, D: 16, E: 14, F: 14, G: 14, H: 14, I: 14, J: 14, K: 12 };
  for (const [col, wd] of Object.entries(widths)) f.setColWidth(sheet, col, col, wd);
  const numFmt = '#,##0.00';
  const titleStyle = f.newStyle({ font: { bold: true, size: 14 } });
  const headStyle = f.newStyle({ font: { bold: true, color: 'FFFFFF' }, fill: { color: '4650B4' } });
  const moneyStyle = f.newStyle({ numFmt });
  const boldMoney = f.newStyle({ font: { bold: true }, numFmt });

  f.setCellValue(sheet, 'A1', `${name} — Ventas del ${from} al ${to} (montos en ${sym})`);
  f.setCellStyle(sheet, 'A1', 'A1', titleStyle);
  const headers = ['Número', 'Fecha', 'Cliente', 'RTN', 'Subtotal', 'Descuento', 'ISV', 'Total',
    'Costo', 'Utilidad', 'Pago', 'Estado'];
  headers.forEach((h, i) => {
    const cell = coordinatesToCellName(i + 1, 3);
    f.setCellValue(sheet, cell, h);
    f.setCellStyle(sheet, cell, cell, headStyle);
  });
  let rowNum = 4;
  for (const v of sales) {
    let utilidad = v.subtotal - v.cost_total;
    if (v.status !== 'completada') utilidad = 0;
    const vals = [v.sale_number, v.sale_date, v.customer_name, v.customer_rtn, v.subtotal, v.discount,
      v.isv, v.total, v.cost_total, utilidad, v.payment_method, v.status];
    vals.forEach((val, i) => f.setCellValue(sheet, coordinatesToCellName(i + 1, rowNum), val));
    f.setCellStyle(sheet, `E${rowNum}`, `J${rowNum}`, moneyStyle);
    rowNum++;
  }
  rowNum++;
  f.setCellValue(sheet, `C${rowNum}`, 'TOTALES (completadas)');
  for (const [col, v] of Object.entries({
    E: totNet, G: totISV, H: totTotal, I: totCost, J: totNet - totCost,
  })) {
    f.setCellValue(sheet, `${col}${rowNum}`, v);
    f.setCellStyle(sheet, `${col}${rowNum}`, `${col}${rowNum}`, boldMoney);
  }
  sendXLSX(ctx.res, `ventas_${from}_${to}.xlsx`, f);
}

// recortar corta por runas y añade la elipsis, como hacía []rune(...) en Go.
function recortar(s, max) {
  const r = [...String(s)];
  return r.length > max ? `${r.slice(0, max - 1).join('')}…` : String(s);
}
