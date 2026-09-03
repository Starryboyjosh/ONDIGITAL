// Cliente HTTP de la API.
async function req(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el sistema?');
  }
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data && data.error) msg = data.error;
    } catch { /* sin cuerpo JSON */ }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  get: (url) => req('GET', url),
  post: (url, body) => req('POST', url, body),
  put: (url, body) => req('PUT', url, body),
  del: (url) => req('DELETE', url),
};

