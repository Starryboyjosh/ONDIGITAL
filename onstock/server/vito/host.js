// Traducción de internal/vitohost/{host,module}.go y modules/modkit/module.go.
// Conecta los módulos de negocio con Vito dentro de OnStock.
import path from 'node:path';
import { Registry } from './registry.js';
import { newServiceFromEnv, loadDotEnvFiles } from './config.js';
import { registerOnStockTools } from './herramientas.js';

// ── modkit: catálogo de módulos ─────────────────────────

export const KIND_QUERY = 'query'; // acceso de solo lectura
export const KIND_ACTION = 'action'; // modifica el estado del negocio

export class Catalog {
  constructor() { this.byID = new Map(); }

  register(m) {
    if (!m) throw new Error('modkit: module is nil');
    if (!m.id) throw new Error('modkit: module id is required');
    if (this.byID.has(m.id)) throw new Error(`modkit: module "${m.id}" already registered`);
    this.byID.set(m.id, m);
  }

  get(id) { return this.byID.get(id); }

  list() {
    return [...this.byID.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  // infos devuelve los metadatos públicos, seguros para GET /api/modules.
  infos() {
    return this.list().map((m) => ({
      id: m.id,
      name: m.name,
      version: m.version,
      // `description,omitempty`
      ...(m.description ? { description: m.description } : {}),
      capabilities: m.capabilities,
    }));
  }

  registerAllVitoTools(reg) {
    if (!reg) throw new Error('modkit: vito registry is nil');
    for (const m of this.list()) {
      try {
        m.registerVitoTools(reg);
      } catch (err) {
        throw new Error(`modkit: module "${m.id}" vito tools: ${err.message}`);
      }
    }
  }
}

// ── El módulo OnStock ───────────────────────────────────

export function newOnStockModule(st) {
  return {
    id: 'onstock',
    name: 'OnStock',
    version: '1.0.0',
    description: 'Inventario, ventas, compras y reportes para tiendas (Honduras).',
    capabilities: [
      {
        id: 'onstock.inventory.low_stock',
        name: 'Stock bajo',
        description: 'Productos activos con stock en o bajo el mínimo.',
        kind: KIND_QUERY,
        vito_tool: 'list_low_stock',
        read_only: true,
      },
      {
        id: 'onstock.sales.summary',
        name: 'Resumen de ventas',
        description: 'Ventas netas, margen y utilidad en un periodo.',
        kind: KIND_QUERY,
        vito_tool: 'sales_summary',
        read_only: true,
      },
      {
        id: 'onstock.sales.top_products',
        name: 'Top productos',
        description: 'Productos con más ingresos en un periodo.',
        kind: KIND_QUERY,
        vito_tool: 'top_products',
        read_only: true,
      },
      {
        id: 'onstock.inventory.slow_movers',
        name: 'Rotación lenta',
        description: 'Productos con poca o nula venta y stock actual.',
        kind: KIND_QUERY,
        vito_tool: 'slow_products',
        read_only: true,
      },
      {
        id: 'onstock.purchases.restock_po',
        name: 'Orden de reposición',
        description: 'Crea una OC en borrador para reponer stock bajo (requiere confirmación).',
        kind: KIND_ACTION,
        vito_tool: 'create_restock_po',
        read_only: false,
      },
    ],
    registerVitoTools(reg) {
      if (!st || !reg) return;
      registerOnStockTools(reg, st);
    },
  };
}

// ── Arranque ────────────────────────────────────────────

// bootstrap carga los .env, registra el módulo de OnStock y, si procede, deja
// listo el servicio de Vito.
export function bootstrap(baseDir, st) {
  loadDotEnvFiles(
    path.join(baseDir, '.env'),
    path.join(baseDir, 'data', '.env'),
    '.env',
  );

  const cat = new Catalog();
  try {
    cat.register(newOnStockModule(st));
  } catch (err) {
    console.log(`modkit: no se pudo registrar OnStock: ${err.message}`);
  }

  const reg = new Registry();
  // Las herramientas salen solo del contrato del módulo (funciona también con
  // Vito apagado, si nunca se llaman).
  try {
    cat.registerAllVitoTools(reg);
  } catch (err) {
    console.log(`vito: tools del catálogo: ${err.message}`);
  }

  const { svc, cfg, err } = newServiceFromEnv(reg);
  const host = { catalog: cat, service: svc, env: cfg, fallback: false };
  if (err) {
    host.fallback = true;
    // Esta ventana la deja abierta el dueño del negocio, no un programador.
    // Se imprime el motivo en español y sin jerga: el envoltorio técnico que
    // añade la capa de proveedores se desenvuelve antes de mostrarlo.
    console.log(`vito: ${motivoMotorLocal(err)}`);
    console.log('vito: mientras tanto responde con el motor local; el inventario, las ventas y los reportes se consultan igual.');
  }
  if (svc) {
    // Esta línea sale en la misma ventana que ve el dueño del negocio, así que
    // describe el motor por dónde corre —nube o equipo local— y nunca por el
    // nombre del proveedor.
    let motor = 'en la nube';
    if (host.fallback) motor = 'local (sin conexión al servicio)';
    else if (cfg.apiKey === '') motor = 'local';
    console.log(`vito: listo (activo=${svc.enabled()} · motor ${motor} · `
      + `${plural(reg.list().length, 'herramienta', 'herramientas')} · `
      + `${plural(cat.list().length, 'módulo', 'módulos')})`);
  }
  return host;
}

// motivoMotorLocal deja el mensaje que de verdad le sirve al dueño del negocio:
// quita el envoltorio técnico de las capas intermedias y el prefijo "vito:" que
// cada una vuelve a agregar.
function motivoMotorLocal(err) {
  let msg = String(err.message ?? '');
  // El error llega envuelto: "Vito quedó en modo local: <causa>".
  const i = msg.indexOf(': ');
  if (msg.startsWith('Vito quedó en modo local') && i >= 0) msg = msg.slice(i + 2);
  msg = msg.replace(/^vito:\s*/, '').trim();
  return msg === '' ? 'no se pudo contactar el motor en la nube' : msg;
}

function plural(n, singular, pl) {
  return `${n} ${n === 1 ? singular : pl}`;
}
