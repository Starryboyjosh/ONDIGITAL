// Fechas locales, como las usaba Go con time.Local.
//
// toISOString() de JavaScript convierte a UTC y en Honduras (UTC-6) eso adelanta
// el día seis horas: un reporte generado a las 19:00 saldría fechado mañana. Todo
// lo que aquí se formatea sale del reloj local, igual que time.Now().Format en Go.

export function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ymdhms(d) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${ymd(d)} ${hh}:${mm}:${ss}`;
}

export function ym(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// dmyHm devuelve "02/01/2006 15:04", el sello que llevan los PDF y los Excel.
export function dmyHm(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

// primerDiaDelMes replica time.Date(y, m, 1, 0,0,0,0, time.Local).
export function primerDiaDelMes(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// addDate replica t.AddDate(años, meses, días) de Go, incluida su normalización
// (31 de enero + 1 mes = 3 de marzo en un año no bisiesto).
export function addDate(d, years, months, days) {
  return new Date(
    d.getFullYear() + years,
    d.getMonth() + months,
    d.getDate() + days,
    d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds(),
  );
}

// rfc3339 con desfase local, el formato de time.Now().Format(time.RFC3339).
export function rfc3339(d = new Date()) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  const oh = String(Math.floor(abs / 60)).padStart(2, '0');
  const om = String(abs % 60).padStart(2, '0');
  return `${ymd(d)}T${ymdhms(d).slice(11)}${sign}${oh}:${om}`;
}

export const MESES_CORTO_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
