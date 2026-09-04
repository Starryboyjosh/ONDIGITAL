// Servidor de archivos estáticos desde disco.
//
// AQUÍ ESTÁ EL CAMBIO DE FONDO frente a la versión en Go: main.go incrustaba
// web/ con go:embed, así que cualquier retoque de CSS o de JS obligaba a
// recompilar el binario para verlo. Este servidor lee onstock/web del disco en
// cada petición: se guarda el archivo, se recarga el navegador y ya está.
import fs from 'node:fs';
import path from 'node:path';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function noEncontrado(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 página no encontrada\n');
}

function redirigir(res, destino) {
  res.writeHead(302, { Location: destino });
  res.end();
}

// serve entrega webDir/<ruta>. Reproduce las dos costumbres de
// http.FileServer: "/dir/" sirve su index.html y "/index.html" redirige a "./".
export function serve(webDir, pathname, res) {
  let rel = decodeURIComponent(pathname);

  // FileServer redirige /index.html → ./ para no tener dos URL del mismo documento.
  if (rel.endsWith('/index.html')) {
    redirigir(res, rel.slice(0, -'index.html'.length));
    return;
  }
  if (rel.endsWith('/')) rel += 'index.html';

  // path.normalize + la comprobación de prefijo cierran los "..".
  const abs = path.normalize(path.join(webDir, rel));
  if (abs !== webDir && !abs.startsWith(webDir + path.sep)) {
    noEncontrado(res);
    return;
  }

  let st;
  try {
    st = fs.statSync(abs);
  } catch {
    noEncontrado(res);
    return;
  }
  if (st.isDirectory()) {
    redirigir(res, `${rel}/`);
    return;
  }

  const tipo = TIPOS[path.extname(abs).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': tipo,
    'Content-Length': st.size,
    'Last-Modified': st.mtime.toUTCString(),
  });
  fs.createReadStream(abs).pipe(res);
}

// serveCaja sirve la interfaz de caja y manda el shell de administración a
// /caja.html, igual que cajaStaticHandler en Go.
export function serveCaja(webDir, pathname, res) {
  if (pathname === '/' || pathname === '/index.html' || pathname === '/index.htm') {
    redirigir(res, '/caja.html');
    return;
  }
  // No exponer el shell admin por un error de tipeo.
  if (pathname === '/app.html') {
    redirigir(res, '/caja.html');
    return;
  }
  serve(webDir, pathname, res);
}
