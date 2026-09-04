// artefactos.mjs — lectores de XLSX, PDF y PNG para comparar exportaciones.
//
// El binario de Go arma esos tres formatos con excelize, fpdf y boombuler/barcode;
// el servidor Node los arma con los escritores de server/lib/. Dos escritores
// distintos jamás producen los mismos bytes aunque digan exactamente lo mismo:
// cambia el orden de las entradas del ZIP, el nivel de compresión, el diccionario
// de fuentes, el número de objetos del PDF. Comparar bytes solo demuestra que son
// dos programas distintos, cosa que ya sabemos.
//
// Lo que sí se puede comparar es el CONTENIDO: qué dice cada celda del Excel, qué
// texto imprime el PDF y qué barras trae el código. Eso es lo que leen estas
// funciones.
import zlib from 'node:zlib';

// ── ZIP ─────────────────────────────────────────────────────────────────────
// Lector mínimo: recorre el directorio central y devuelve {nombre: contenido}.
export function leerZip(buf) {
  // El "End of Central Directory" va al final y puede llevar comentario detrás.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('no es un ZIP: falta el directorio central');
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = {};
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('entrada corrupta en el directorio');
    const metodo = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const largoNombre = buf.readUInt16LE(p + 28);
    const largoExtra = buf.readUInt16LE(p + 30);
    const largoCom = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const nombre = buf.toString('utf8', p + 46, p + 46 + largoNombre);
    // La cabecera local repite nombre y extra, y sus largos pueden no coincidir
    // con los del directorio: hay que leerlos de la propia cabecera local.
    const lNombre = buf.readUInt16LE(offset + 26);
    const lExtra = buf.readUInt16LE(offset + 28);
    const inicio = offset + 30 + lNombre + lExtra;
    const crudo = buf.subarray(inicio, inicio + compSize);
    out[nombre] = metodo === 8 ? zlib.inflateRawSync(crudo) : Buffer.from(crudo);
    p += 46 + largoNombre + largoExtra + largoCom;
  }
  return out;
}

// ── XLSX ────────────────────────────────────────────────────────────────────
function textoDeXML(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, '&');
}

// filasXLSX devuelve una entrada por fila con contenido: "Hoja!A=…|B=…|C=…",
// en el orden en que aparecen las filas.
//
// Se agrupa por fila y se deja fuera el NÚMERO de fila a propósito: así dos
// libros con las mismas filas en distinto orden salen como un solo desajuste de
// orden en vez de como cien celdas distintas, y sigue detectándose que una
// columna cambió de sitio o que una cifra cambió de valor.
export function filasXLSX(buf) {
  const z = leerZip(buf);
  // sharedStrings: excelize mete casi todo el texto ahí; el escritor propio usa
  // cadenas en línea. Se resuelven las dos formas y el resultado se ve igual.
  const compartidas = [];
  const ss = z['xl/sharedStrings.xml'];
  if (ss) {
    for (const si of ss.toString('utf8').split('<si>').slice(1)) {
      const partes = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => textoDeXML(m[1]));
      compartidas.push(partes.join(''));
    }
  }
  const wb = (z['xl/workbook.xml'] ?? Buffer.from('')).toString('utf8');
  const nombres = [...wb.matchAll(/<sheet[^>]*name="([^"]*)"/g)].map((m) => textoDeXML(m[1]));

  const salida = [];
  const hojas = Object.keys(z).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  hojas.forEach((archivo, i) => {
    const hoja = nombres[i] ?? archivo;
    const xml = z[archivo].toString('utf8');
    for (const m of xml.matchAll(/<c\s[^>]*r="([A-Z]+\d+)"([^>]*)\/?>([\s\S]*?)(?:<\/c>|(?=<c[\s>])|$)/g)) {
      const [, ref, attrs, cuerpo] = m;
      const tipo = /t="([^"]*)"/.exec(attrs)?.[1] ?? 'n';
      let v = '';
      if (tipo === 's') {
        const idx = /<v>(\d+)<\/v>/.exec(cuerpo)?.[1];
        v = idx === undefined ? '' : (compartidas[+idx] ?? '');
      } else if (tipo === 'inlineStr') {
        v = [...cuerpo.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => textoDeXML(x[1])).join('');
      } else {
        const raw = /<v>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1];
        v = raw === undefined ? '' : textoDeXML(raw);
        // Un número se compara como número: "172" y "172.00" son la misma cifra
        // y ninguna hoja de cálculo los distingue.
        if (v !== '' && Number.isFinite(Number(v))) v = String(Number(Number(v).toFixed(6)));
      }
      if (v === '') continue;
      const col = /^[A-Z]+/.exec(ref)[0];
      const fila = Number(ref.slice(col.length));
      let acc = salida.find((f) => f.hoja === hoja && f.fila === fila);
      if (!acc) { acc = { hoja, fila, celdas: [] }; salida.push(acc); }
      acc.celdas.push(`${col}=${v}`);
    }
  });
  // Dentro de una fila el orden de emisión es cosa de cada escritor; se ordena
  // por columna. Entre filas sí se conserva el orden, que es información real.
  return salida
    .sort((a, b) => (a.hoja === b.hoja ? a.fila - b.fila : a.hoja.localeCompare(b.hoja)))
    .map((f) => `${f.hoja}!${f.celdas.sort().join('|')}`);
}

// ── PDF ─────────────────────────────────────────────────────────────────────
// Tabla de escapes de cadena literal de PDF (sección 7.3.4.2 de la ISO 32000).
const ESCAPES = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };

function cadenaPDF(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '\\') { out += s[i]; continue; }
    const c = s[++i];
    if (c === undefined) break;
    if (c >= '0' && c <= '7') {
      let oct = c;
      while (oct.length < 3 && s[i + 1] >= '0' && s[i + 1] <= '7') oct += s[++i];
      out += String.fromCharCode(Number.parseInt(oct, 8));
      continue;
    }
    out += ESCAPES[c] ?? c;
  }
  return out;
}

// filasPDF devuelve una entrada por renglón impreso, de arriba abajo, con los
// fragmentos de ese renglón ordenados de izquierda a derecha y unidos por "|".
//
// Los dos escritores colocan cada fragmento con `BT x y Td (texto) Tj ET` y la
// coordenada Y les sale idéntica, así que agrupar por Y reconstruye el renglón
// tal como se ve impreso. La X NO entra en la comparación: depende de la tabla
// de anchos de la fuente que use cada escritor para centrar y alinear a la
// derecha, y ahí sí discrepan por décimas de punto sin que cambie nada de lo
// que dice el documento.
export function filasPDF(buf) {
  let i = 0;
  const contenidos = [];
  while (true) {
    const ini = buf.indexOf('stream', i);
    if (ini < 0) break;
    let d = ini + 6;
    if (buf[d] === 0x0d) d++;
    if (buf[d] === 0x0a) d++;
    const fin = buf.indexOf('endstream', d);
    if (fin < 0) break;
    const cuerpo = buf.subarray(d, fin);
    try { contenidos.push(zlib.inflateSync(cuerpo).toString('latin1')); } catch {
      contenidos.push(cuerpo.toString('latin1'));
    }
    i = fin + 9;
  }
  const trozos = [];
  let pagina = 0;
  for (const c of contenidos) {
    let hubo = false;
    const re = /BT\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Td\s*\(((?:\\.|[^\\()])*)\)\s*Tj/g;
    for (const m of c.matchAll(re)) {
      hubo = true;
      trozos.push({ pagina, x: Number(m[1]), y: Number(m[2]), texto: cadenaPDF(m[3]) });
    }
    if (hubo) pagina++;
  }
  const filas = new Map();
  for (const t of trozos) {
    // Una décima de punto arriba o abajo sigue siendo el mismo renglón.
    const clave = `${t.pagina}|${t.y.toFixed(1)}`;
    if (!filas.has(clave)) filas.set(clave, []);
    filas.get(clave).push(t);
  }
  return [...filas.entries()]
    .sort((a, b) => {
      const [pa, ya] = a[0].split('|').map(Number);
      const [pb, yb] = b[0].split('|').map(Number);
      return pa === pb ? yb - ya : pa - pb; // Y crece hacia arriba en PDF
    })
    .map(([, ts]) => ts.sort((m, n) => m.x - n.x)
      .map((t) => t.texto.replace(/\s+/g, ' ').trim())
      .filter((t) => t !== '')
      .join('|'))
    .filter((f) => f !== '');
}

// ── PNG ─────────────────────────────────────────────────────────────────────
function trozosPNG(buf) {
  const out = [];
  let p = 8; // firma
  while (p + 8 <= buf.length) {
    const largo = buf.readUInt32BE(p);
    const tipo = buf.toString('latin1', p + 4, p + 8);
    out.push({ tipo, datos: buf.subarray(p + 8, p + 8 + largo) });
    p += 12 + largo;
    if (tipo === 'IEND') break;
  }
  return out;
}

function paeth(a, b, c) {
  const pa = Math.abs(b - c); const pb = Math.abs(a - c);
  const pc = Math.abs(a + b - 2 * c);
  return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
}

// barrasPNG decodifica el PNG y devuelve el patrón del código de barras
// normalizado: la fila central pasada a longitudes de racha, divididas por la
// racha mínima. Así dos imágenes del mismo código con distinto ancho de módulo
// dan exactamente la misma cadena, y dos códigos distintos no.
export function barrasPNG(buf) {
  const ch = trozosPNG(buf);
  const ihdr = ch.find((c) => c.tipo === 'IHDR');
  if (!ihdr) throw new Error('no es un PNG');
  const ancho = ihdr.datos.readUInt32BE(0);
  const alto = ihdr.datos.readUInt32BE(4);
  const bits = ihdr.datos[8];
  const color = ihdr.datos[9];
  const canales = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
  if (canales === undefined) throw new Error(`tipo de color PNG no soportado: ${color}`);
  const bpp = Math.max(1, Math.ceil((canales * bits) / 8));
  const bytesFila = Math.ceil((ancho * canales * bits) / 8);

  const datos = zlib.inflateSync(Buffer.concat(ch.filter((c) => c.tipo === 'IDAT').map((c) => c.datos)));
  const fila = Buffer.alloc(bytesFila);
  const previa = Buffer.alloc(bytesFila);
  const objetivo = Math.floor(alto / 2);
  let p = 0;
  let encontrada = null;
  for (let y = 0; y < alto; y++) {
    const filtro = datos[p++];
    datos.copy(fila, 0, p, p + bytesFila);
    p += bytesFila;
    for (let x = 0; x < bytesFila; x++) {
      const a = x >= bpp ? fila[x - bpp] : 0;
      const b = previa[x];
      const c = x >= bpp ? previa[x - bpp] : 0;
      if (filtro === 1) fila[x] = (fila[x] + a) & 0xff;
      else if (filtro === 2) fila[x] = (fila[x] + b) & 0xff;
      else if (filtro === 3) fila[x] = (fila[x] + ((a + b) >> 1)) & 0xff;
      else if (filtro === 4) fila[x] = (fila[x] + paeth(a, b, c)) & 0xff;
    }
    fila.copy(previa);
    if (y === objetivo) { encontrada = Buffer.from(fila); break; }
  }
  if (!encontrada) throw new Error('PNG sin filas');

  // Píxel a píxel: oscuro = barra.
  const oscuro = [];
  for (let x = 0; x < ancho; x++) {
    let v;
    if (bits === 1) v = ((encontrada[x >> 3] >> (7 - (x & 7))) & 1) ? 255 : 0;
    else if (bits === 8) v = encontrada[x * canales];
    else if (bits === 16) v = encontrada[x * canales * 2];
    else throw new Error(`profundidad PNG no soportada: ${bits}`);
    // Con paleta, el índice 0 suele ser el negro; se compara igual contra 128.
    oscuro.push(v < 128);
  }
  const rachas = [];
  let actual = oscuro[0]; let largo = 0;
  for (const b of oscuro) {
    if (b === actual) { largo++; continue; }
    rachas.push({ negro: actual, largo });
    actual = b; largo = 1;
  }
  rachas.push({ negro: actual, largo });
  // Los márgenes en blanco de los extremos no son parte del código.
  while (rachas.length && !rachas[0].negro) rachas.shift();
  while (rachas.length && !rachas[rachas.length - 1].negro) rachas.pop();
  if (rachas.length === 0) return { ancho, alto, patron: '' };
  const modulo = Math.min(...rachas.map((r) => r.largo));
  const patron = rachas.map((r) => `${r.negro ? 'N' : 'B'}${Math.round(r.largo / modulo)}`).join('');
  return { ancho, alto, patron };
}
