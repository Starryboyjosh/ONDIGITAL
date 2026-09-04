// Codificador PNG en escala de grises de 8 bits. Reemplaza image/png de la
// biblioteca estándar de Go; comprime con node:zlib, sin dependencias npm.
import zlib from 'node:zlib';
import { crc32 } from './zip.js';

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// encodeGray8 recibe un mapa de bytes (0 = negro, 255 = blanco) de w×h.
export function encodeGray8(pixels, w, h) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0; // filtro None
    pixels.copy(raw, y * (w + 1) + 1, y * w, (y + 1) * w);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 0; // tipo de color: escala de grises
  ihdr[10] = 0; // compresión
  ihdr[11] = 0; // filtro
  ihdr[12] = 0; // entrelazado
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
