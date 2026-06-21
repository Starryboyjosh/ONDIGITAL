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
  
  const data = await res.json();

  // Trigger syncItemToFirebase asíncronamente en operaciones de escritura exitosas
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    import('./firebase/sync.js').then(({ syncItemToFirebase }) => {
      try {
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.pathname;
        let match;
        
        if (path === '/api/settings') {
          syncItemToFirebase('settings', 'save', 'current_settings', data);
        } else if (match = path.match(/^\/api\/products(?:\/(\d+))?$/)) {
          const id = match[1] || data.id;
          if (method === 'DELETE') {
            syncItemToFirebase('products', 'delete', id);
          } else {
            syncItemToFirebase('products', 'save', id, data);
          }
        } else if (match = path.match(/^\/api\/categories(?:\/(\d+))?$/)) {
          const id = match[1] || data.id;
          if (method === 'DELETE') {
            syncItemToFirebase('categories', 'delete', id);
          } else {
            const syncData = method === 'PUT' ? { id: parseInt(id), ...body } : data;
            syncItemToFirebase('categories', 'save', id, syncData);
          }
        } else if (match = path.match(/^\/api\/suppliers(?:\/(\d+))?$/)) {
          const id = match[1] || data.id;
          if (method === 'DELETE') {
            syncItemToFirebase('suppliers', 'delete', id);
          } else {
            syncItemToFirebase('suppliers', 'save', id, data);
          }
        } else if (match = path.match(/^\/api\/sales(?:\/(\d+)(?:\/void)?)?$/)) {
          const id = match[1] || data.id;
          syncItemToFirebase('sales', 'save', id, data);
        } else if (match = path.match(/^\/api\/purchase-orders(?:\/(\d+)(?:\/status)?)?$/)) {
          const id = match[1] || data.id;
          if (method === 'DELETE') {
            syncItemToFirebase('purchase_orders', 'delete', id);
          } else {
            syncItemToFirebase('purchase_orders', 'save', id, data);
          }
        } else if (match = path.match(/^\/api\/expenses(?:\/(\d+))?$/)) {
          const id = match[1] || data.id;
          if (method === 'DELETE') {
            syncItemToFirebase('expenses', 'delete', id);
          } else {
            syncItemToFirebase('expenses', 'save', id, data);
          }
        } else if (path === '/api/movements') {
          if (data && data.id) {
            syncItemToFirebase('products', 'save', data.id, data);
          }
        }
      } catch (syncErr) {
        console.error("Error en gancho de sincronización Firebase:", syncErr);
      }
    }).catch(err => console.error("Error cargando el módulo de sincronización:", err));
  }

  return data;
}

export const api = {
  get: (url) => req('GET', url),
  post: (url, body) => req('POST', url, body),
  put: (url, body) => req('PUT', url, body),
  del: (url) => req('DELETE', url),
};

