// Códigos de barras EAN-8 / EAN-13 / Code128, sin dependencias.
// Reemplaza github.com/boombuler/barcode.
//
// La regla de selección es la de internal/httpapi/barcode.go: si el texto es
// numérico de 8, 12 o 13 dígitos se intenta EAN; si no —o si el dígito
// verificador no cuadra— se cae a Code128, que acepta cualquier texto.

// ── EAN ──────────────────────────────────────────────────

const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100'];

// Paridad de los seis dígitos de la mitad izquierda según el primer dígito.
const EAN13_PARIDAD = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
];

function digitos(code) {
  return [...code].map((c) => c.charCodeAt(0) - 48);
}

// checkEAN13 calcula el dígito verificador de doce dígitos de datos.
function checkEAN13(d) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += d[i] * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

// checkEAN8 calcula el verificador de siete dígitos de datos.
function checkEAN8(d) {
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += d[i] * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}

// encodeEAN devuelve la cadena de módulos ("1" = barra) o null si no aplica.
function encodeEAN(code) {
  const d = digitos(code);
  if (code.length === 12) {
    d.push(checkEAN13(d));
  } else if (code.length === 13) {
    if (d[12] !== checkEAN13(d)) return null; // verificador incorrecto
  } else if (code.length === 8) {
    if (d[7] !== checkEAN8(d)) return null;
  } else {
    return null;
  }

  if (d.length === 8) {
    let out = '101';
    for (let i = 0; i < 4; i++) out += EAN_L[d[i]];
    out += '01010';
    for (let i = 4; i < 8; i++) out += EAN_R[d[i]];
    return `${out}101`;
  }
  const paridad = EAN13_PARIDAD[d[0]];
  let out = '101';
  for (let i = 1; i <= 6; i++) {
    out += paridad[i - 1] === 'L' ? EAN_L[d[i]] : EAN_G[d[i]];
  }
  out += '01010';
  for (let i = 7; i <= 12; i++) out += EAN_R[d[i]];
  return `${out}101`;
}

// ── Code128 ──────────────────────────────────────────────

// Cada patrón describe seis anchos alternando barra/espacio; el de parada lleva
// siete. Es la tabla estándar completa (valores 0 a 106).
const C128 = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_A = 103;
const START_B = 104;
const START_C = 105;
const CODE_A = 101;
const CODE_B = 100;
const CODE_C = 99;
const STOP = 106;

const esDigito = (r) => r >= 48 && r <= 57;
// El juego A cubre los de control (0-31) y del espacio al guion bajo (32-95).
const cabeEnA = (r) => r < 96;
// El juego B cubre del espacio al DEL (32-127).
const cabeEnB = (r) => r >= 32 && r <= 127;

function valorA(r) {
  return r < 32 ? r + 64 : r - 32;
}

function valorB(r) {
  return r - 32;
}

// convieneC decide si toca meterse (o quedarse) en el juego C, que empaqueta dos
// dígitos por símbolo. Ya estando en C basta con que queden dos dígitos; para
// entrar desde otro juego hacen falta cuatro, porque el símbolo de cambio cuesta
// lo mismo que un carácter y con solo dos dígitos no se gana nada.
function convieneC(runas, i, enC) {
  const faltan = enC ? 2 : 4;
  if (runas.length - i < faltan) return false;
  for (let k = 0; k < faltan; k++) if (!esDigito(runas[i + k])) return false;
  return true;
}

// convieneA decide entre el juego A y el B. No basta con mirar el carácter que
// toca: si más adelante viene uno de control y hasta entonces todo cabe en A,
// conviene entrar en A ya y ahorrarse el símbolo de cambio. Si antes de ese
// control aparece algo que solo cabe en B (minúsculas, llaves, DEL), entonces no.
function convieneA(runas, i) {
  if (runas[i] < 32) return true;
  for (let k = i; k < runas.length; k++) {
    if (runas[k] < 32) return true;
    if (!cabeEnA(runas[k])) return false;
  }
  return false;
}

// encodeCode128 reproduce la selección de juegos de boombuler/barcode: arranca en
// C si el texto empieza por dígitos suficientes, en A si toca un carácter de
// control antes que uno exclusivo del juego B, y en B en cualquier otro caso;
// después cambia de juego en cuanto deja de convenir el actual.
//
// No es un detalle estético. Con el juego B a secas, "7501234567890" ocupa 178
// módulos; repartiendo los dígitos en C ocupa 123. En una etiqueta de ancho fijo
// eso es la diferencia entre barras de dos píxeles y barras de uno.
function encodeCode128(code) {
  const runas = [...code].map((c) => c.codePointAt(0));
  if (runas.length === 0) return null;
  for (const r of runas) if (!cabeEnA(r) && !cabeEnB(r)) return null;

  let juego;
  if (convieneC(runas, 0, false)) juego = 'C';
  else if (convieneA(runas, 0)) juego = 'A';
  else juego = 'B';
  const values = [{ A: START_A, B: START_B, C: START_C }[juego]];

  let i = 0;
  while (i < runas.length) {
    if (juego === 'C') {
      if (convieneC(runas, i, true)) {
        values.push((runas[i] - 48) * 10 + (runas[i + 1] - 48));
        i += 2;
        continue;
      }
      juego = convieneA(runas, i) ? 'A' : 'B';
      values.push(juego === 'A' ? CODE_A : CODE_B);
      continue;
    }
    if (convieneC(runas, i, false)) {
      juego = 'C';
      values.push(CODE_C);
      continue;
    }
    const r = runas[i];
    if (juego === 'A' && !cabeEnA(r)) {
      juego = 'B';
      values.push(CODE_B);
      continue;
    }
    if (juego === 'B' && !cabeEnB(r)) {
      juego = 'A';
      values.push(CODE_A);
      continue;
    }
    values.push(juego === 'A' ? valorA(r) : valorB(r));
    i++;
  }

  let sum = values[0];
  for (let k = 1; k < values.length; k++) sum += values[k] * k;
  values.push(sum % 103); // dígito de control
  values.push(STOP);

  let bits = '';
  for (const v of values) {
    const pat = C128[v];
    let negro = true;
    for (const w of pat) {
      bits += (negro ? '1' : '0').repeat(Number(w));
      negro = !negro;
    }
  }
  return bits;
}

// modulos devuelve la fila de módulos del código, eligiendo simbología igual
// que encodeBarcode en Go.
export function modulos(code) {
  const soloDigitos = code.length > 0 && /^[0-9]+$/.test(code);
  if (soloDigitos && (code.length === 8 || code.length === 12 || code.length === 13)) {
    const ean = encodeEAN(code);
    if (ean) return ean;
  }
  const c128 = encodeCode128(code);
  if (!c128) throw new Error(`no se puede codificar "${code}"`);
  return c128;
}

// escalar amplía la fila de módulos a un mapa de w×h píxeles, con el mismo
// criterio que barcode.Scale: factor entero y sobrante repartido a los lados.
export function escalar(bits, w, h) {
  const orig = bits.length;
  if (w < orig) throw new Error(`el ancho ${w} es menor que los ${orig} módulos del código`);
  const factor = Math.floor(w / orig);
  const offsetX = Math.floor((w - orig * factor) / 2);
  const px = Buffer.alloc(w * h, 255); // blanco
  for (let i = 0; i < orig; i++) {
    if (bits[i] !== '1') continue;
    const x0 = offsetX + i * factor;
    for (let y = 0; y < h; y++) {
      px.fill(0, y * w + x0, y * w + x0 + factor);
    }
  }
  return px;
}
