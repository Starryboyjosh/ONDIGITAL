// Ayudantes de la capa HTTP. Traducción de los helpers de internal/httpapi/api.go.
import { ErrNotFound } from '../store/index.js';

export function writeJSON(res, status, v) {
  const body = `${JSON.stringify(v)}\n`; // json.Encoder de Go añade el salto
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

// comoMapaDeGo reordena las claves alfabéticamente.
//
// Los tipos con nombre (structs) salen en el orden en que están declaradas sus
// campos, y eso el port lo respeta escribiendo los objetos literales en ese
// mismo orden. Los mapas no: `encoding/json` los ordena por clave siempre. Los
// tres endpoints que en Go devuelven un `map` con más de una clave tienen que
// pasar por aquí o el JSON sale con las claves en otro orden que el original.
export function comoMapaDeGo(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

// writeErr: 404 si el error es "no encontrado", 400 en cualquier otro caso,
// exactamente como el original.
export function writeErr(res, err) {
  const status = err instanceof ErrNotFound || err?.notFound ? 404 : 400;
  writeJSON(res, status, { error: err.message });
}

// readJSON lee y decodifica el cuerpo. Lanza si no es JSON válido.
export async function readJSON(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.trim() === '') throw new Error('EOF');
  return JSON.parse(raw);
}

// pathID valida el {id} de la ruta.
export function pathID(params) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0 || String(id) !== String(params.id).trim()) {
    throw new Error('id inválido');
  }
  return id;
}

// qInt replica strconv.ParseInt sobre un parámetro de consulta: lo que no sea
// un entero completo vale cero.
export function qInt(url, key) {
  const v = url.searchParams.get(key);
  if (v === null || !/^[+-]?\d+$/.test(v.trim())) return 0;
  return Number.parseInt(v, 10);
}

export function q(url, key) {
  return url.searchParams.get(key) ?? '';
}
