// Traducción de modules/vito/tools.go.
// Registro de herramientas que Vito puede llamar: es lo que lo mantiene atado a
// los datos reales del negocio.

export class Registry {
  constructor() {
    this.meta = new Map();
    this.funcs = new Map();
  }

  // register agrega o reemplaza una herramienta. El nombre es obligatorio.
  register(tool, fn) {
    if (!tool.name) throw new Error('vito: tool name is required');
    if (!fn) throw new Error(`vito: tool "${tool.name}" handler is nil`);
    this.meta.set(tool.name, tool);
    this.funcs.set(tool.name, fn);
  }

  list() { return [...this.meta.values()]; }

  get(name) { return this.meta.get(name); }

  // run ejecuta una herramienta registrada. Devuelve {res, err} en vez de
  // lanzar, porque el servicio distingue el fallo de la herramienta del fallo
  // del proceso, igual que hacía el par (ToolResult, error) de Go.
  async run(call) {
    const fn = this.funcs.get(call.name);
    if (!fn) {
      return {
        res: {
          call_id: call.id,
          name: call.name,
          ok: false,
          error: `herramienta no registrada: ${call.name}`,
          content: '',
        },
        err: new Error(`vito: unknown tool "${call.name}"`),
      };
    }
    try {
      const res = await fn(call.arguments ?? {});
      if (!res.call_id) res.call_id = call.id;
      if (!res.name) res.name = call.name;
      return { res, err: res.ok ? null : new Error(res.error ?? 'fallo de la herramienta') };
    } catch (err) {
      return {
        res: {
          call_id: call.id, name: call.name, ok: false,
          error: err.message, content: JSON.stringify({ error: err.message }),
        },
        err,
      };
    }
  }
}
