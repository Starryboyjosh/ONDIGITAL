// Traducción de modules/vito/mock_provider.go.
// Motor local: responde sin red ni clave. Es el que sostiene la demo cuando no
// hay conexión, y el que se usa en las pruebas.

export class ProveedorLocal {
  // El nombre es solo para los registros del servidor; nunca sale a pantalla.
  name() { return 'mock'; }

  async ask(req) {
    const user = lastUserText(req.messages);
    const lower = user.toLowerCase();

    // Cuando la pregunta suena a stock bajo y la herramienta existe, se usa.
    if (looksLikeLowStock(lower)) {
      if (hasTool(req.tools, 'list_low_stock')) {
        return {
          content: '',
          tool_calls: [{ id: 'call_low_stock_1', name: 'list_low_stock', arguments: { limit: 20 } }],
        };
      }
      return {
        content: 'Puedo ayudarte con el inventario cuando el sistema me dé acceso a los datos de stock. Por ahora no tengo esa herramienta conectada.',
        tool_calls: [],
      };
    }

    if (looksLikeSales(lower) && hasTool(req.tools, 'sales_summary')) {
      const period = (lower.includes('mes') || lower.includes('30')) ? '30d' : '7d';
      return { content: '', tool_calls: [{ id: 'call_sales_1', name: 'sales_summary', arguments: { period } }] };
    }

    if (looksLikeSlow(lower) && hasTool(req.tools, 'slow_products')) {
      return {
        content: '',
        tool_calls: [{ id: 'call_slow_1', name: 'slow_products', arguments: { period: '30d', limit: 8 } }],
      };
    }

    if (looksLikeRestockPO(lower) && hasTool(req.tools, 'create_restock_po')) {
      return {
        content: '',
        tool_calls: [{
          id: 'call_po_1',
          name: 'create_restock_po',
          arguments: { notes: 'Generada por Vito · reposición de stock bajo' },
        }],
      };
    }

    // Pérdidas / cómo mejorar: juntar ventas + stock bajo + rotación lenta.
    if (looksLikeLossOrAdvice(lower)) {
      const calls = [];
      if (hasTool(req.tools, 'sales_summary')) {
        calls.push({ id: 'call_sales_loss', name: 'sales_summary', arguments: { period: '30d' } });
      }
      if (hasTool(req.tools, 'list_low_stock')) {
        calls.push({ id: 'call_stock_loss', name: 'list_low_stock', arguments: { limit: 15 } });
      }
      if (hasTool(req.tools, 'slow_products')) {
        calls.push({ id: 'call_slow_loss', name: 'slow_products', arguments: { period: '30d', limit: 6 } });
      }
      if (calls.length > 0) return { content: '', tool_calls: calls };
    }

    // Si ya hay resultados de herramientas, cerrar con algo apoyado en ellos.
    if (lastToolContent(req.messages) !== '') {
      return {
        content: 'Con base en los datos del sistema: revisa el resumen anterior. '
          + 'Para reducir pérdidas suele ayudar reponer lo que se agota, empujar lo de rotación lenta y vigilar el margen de las ventas del mes.',
        tool_calls: [],
      };
    }

    if (user === '') {
      return {
        content: 'Hola, soy Vito. Pregúntame sobre tu inventario, ventas o lo que necesites del negocio.',
        tool_calls: [],
      };
    }

    // Las herramientas sí están conectadas: no entendió la frase — orientar, no mentir.
    if (req.tools.length > 0) {
      return {
        content: `Entendí: «${truncateRunes(user, 120)}». Puedo consultar datos reales de tu OnStock. Prueba por ejemplo:\n`
          + '• ¿Qué productos están por agotarse?\n'
          + '• ¿Cuánto vendí esta semana y cuál fue mi margen?\n'
          + '• ¿Qué producto se mueve más lento?\n'
          + '• ¿Cómo puedo evitar pérdidas?\n'
          + '• Genera la orden de compra de lo que falta\n\n'
          + 'Para ampliar el tipo de consultas disponibles, contacta al administrador del sistema.',
        tool_calls: [],
      };
    }

    return {
      content: `Entendí tu consulta: «${truncateRunes(user, 160)}». Aún no hay herramientas de datos conectadas en este host.`,
      tool_calls: [],
    };
  }
}

function lastUserText(msgs) {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') return String(msgs[i].content ?? '').trim();
  }
  return '';
}

function hasTool(tools, name) {
  return tools.some((t) => t.name === name);
}

function looksLikeLowStock(s) {
  const keys = ['agot', 'stock bajo', 'reposición', 'reposicion',
    'faltante', 'por acabarse', 'pocas unidades', 'sin stock',
    'low stock', 'inventario bajo'];
  if (keys.some((k) => s.includes(k))) return true;
  return s.includes('productos') && (s.includes('falta') || s.includes('bajo'));
}

function looksLikeSales(s) {
  return ['vend', 'venta', 'margen', 'ingreso', 'factur', 'utilidad', 'gananc'].some((k) => s.includes(k));
}

function looksLikeLossOrAdvice(s) {
  return ['perdida', 'pérdida', 'perdidas', 'pérdidas',
    'evitar', 'reducir costos', 'mejorar margen', 'merma',
    'cómo gano', 'como gano', 'rentab', 'optimizar'].some((k) => s.includes(k));
}

function looksLikeSlow(s) {
  return ['lento', 'lenta', 'no se mueve', 'poco movimiento', 'rotación', 'rotacion', 'estancad']
    .some((k) => s.includes(k));
}

function looksLikeRestockPO(s) {
  const keys = ['orden de compra', 'orden de reposición', 'orden de reposicion',
    'genera la orden', 'generar la orden', 'crea la orden', 'crear orden',
    'compra de lo que falta', 'reponer lo que falta'];
  if (keys.some((k) => s.includes(k))) return true;
  return s.includes('orden') && (s.includes('falta') || s.includes('stock'));
}

function lastToolContent(msgs) {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'tool' && String(msgs[i].content ?? '').trim() !== '') return msgs[i].content;
  }
  return '';
}

export function truncateRunes(s, max) {
  const r = [...String(s)];
  return r.length <= max ? String(s) : `${r.slice(0, max).join('')}…`;
}
