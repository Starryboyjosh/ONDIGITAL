// Enrutador con la semántica de http.ServeMux de Go 1.22: patrones
// "MÉTODO /ruta/{param}", el patrón más específico gana y una ruta que existe
// con otro método responde 405.
export class Router {
  constructor() {
    this.routes = [];
  }

  // handle registra "GET /api/products/{id}" → fn(req, res, params).
  handle(pattern, fn) {
    const sp = pattern.indexOf(' ');
    let method = '';
    let path = pattern;
    if (sp > 0) {
      method = pattern.slice(0, sp);
      path = pattern.slice(sp + 1);
    }
    const prefix = path.endsWith('/');
    const segs = path.split('/').filter((s) => s !== '');
    this.routes.push({
      method,
      prefix,
      segs: segs.map((s) => (s.startsWith('{') && s.endsWith('}')
        ? { wild: true, name: s.slice(1, -1) }
        : { wild: false, name: s })),
      fn,
      // Especificidad: primero cuántos segmentos literales tiene, después
      // cuántos segmentos en total, y las rutas exactas por delante de los
      // prefijos. Es el orden en que ServeMux resuelve los empates.
      score: segs.filter((s) => !s.startsWith('{')).length * 1000
        + segs.length * 10 + (prefix ? 0 : 1),
    });
    this.routes.sort((a, b) => b.score - a.score);
  }

  // match devuelve {fn, params} del patrón más específico que case con el
  // método Y la ruta, o null.
  //
  // Un patrón que casa la ruta pero no el método NO corta la búsqueda: se sigue
  // con los patrones menos específicos. Es lo que hace ServeMux, y es lo que
  // decide qué contesta OnStock ante `DELETE /api/dashboard`: hay un
  // `GET /api/dashboard`, pero también el comodín `/` del servidor de estáticos,
  // así que gana el comodín y la respuesta es el 404 del servidor de archivos,
  // no un 405. Con el comodín siempre registrado, ServeMux nunca llega a emitir
  // 405 en este programa y por eso aquí tampoco se construye.
  match(method, pathname) {
    const partes = pathname.split('/').filter((s) => s !== '');
    for (const r of this.routes) {
      if (r.prefix) {
        if (partes.length < r.segs.length) continue;
      } else if (partes.length !== r.segs.length) continue;
      if (r.method && r.method !== method) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < r.segs.length; i++) {
        const s = r.segs[i];
        if (s.wild) params[s.name] = decodeURIComponent(partes[i]);
        else if (s.name !== partes[i]) { ok = false; break; }
      }
      if (!ok) continue;
      return { fn: r.fn, params };
    }
    return null;
  }
}
