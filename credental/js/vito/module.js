/* ==========================================================================
   Módulo Credental (modkit) + tools Vito
   Capacidades agenda / pacientes / cobranzas · datos vía window.db (híbrido)
   ========================================================================== */
(function (global) {
  'use strict';

  // Ultima linea de la marca blanca: si el motor ignora su prompt y se presenta
  // por su nombre, ese nombre no llega a pantalla. Espeja la guarda del backend
  // en modules/vito/service.go y hay que mantenerlas juntas.
  // El flag `g` no es un detalle: sin el, `replace` solo tapaba la PRIMERA
  // aparicion y la segunda salia intacta. Los limites `\b` evitan comerse
  // palabras que contengan el termino, y cubre familias enteras (`gpt-4`,
  // `gpt-5`, `gpt`) porque el modelo de manana no esta en la lista de hoy.
  // "Llama" queda fuera a proposito: en espanol es un verbo corriente
  // ("se llama Ana") y sustituirlo romperia el texto en vez de protegerlo.
  const BANNED = /\b(claude|chatgpt|openai|opencode|anthropic|gpt-?[0-9]+|gpt|gemini|nemotron|deepseek|mistral|qwen|copilot|grok)\b/gi;

  function money(n) {
    const v = Number(n) || 0;
    if (global.formatMoney) return global.formatMoney(v);
    return 'L ' + v.toFixed(2);
  }

  function todayISO() {
    const date = new Date();
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function addDaysISO(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  const MESES_ES = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
    agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
  };

  function isoDe(anio, mes, dia) {
    if (!mes || !dia || dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
    return anio + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
  }

  // Lee la fecha que pide la pregunta. Antes solo se distinguía «hoy» de
  // «mañana» y cualquier otra fecha («el 15 de septiembre») devolvía la agenda
  // de mañana: la respuesta contradecía la pregunta.
  // Recibe el texto ya en minúsculas y sin acentos.
  function fechaPedida(lower) {
    if (/pasado\s+manana/.test(lower)) return addDaysISO(2);
    if (/\bmanana\b/.test(lower)) return addDaysISO(1);
    if (/\bhoy\b/.test(lower)) return todayISO();
    if (/\bayer\b/.test(lower)) return addDaysISO(-1);

    let m = lower.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return isoDe(Number(m[1]), Number(m[2]), Number(m[3]));

    m = lower.match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))?/);
    if (m && MESES_ES[m[2]]) {
      const anio = m[3] ? Number(m[3]) : new Date().getFullYear();
      return isoDe(anio, MESES_ES[m[2]], Number(m[1]));
    }

    m = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (m) {
      let anio = m[3] ? Number(m[3]) : new Date().getFullYear();
      if (anio < 100) anio += 2000;
      return isoDe(anio, Number(m[2]), Number(m[1]));
    }
    return null;
  }

  // Vito habla como la clínica: fechas en español y estados en español.
  // Si por algún motivo main.js no está cargado, hay respaldo local.
  function fechaEs(iso) {
    if (global.formatDateLargaEs) return global.formatDateLargaEs(iso);
    return String(iso || '');
  }

  function fechaCorta(iso) {
    if (global.formatDateEs) return global.formatDateEs(iso);
    return String(iso || '');
  }

  const ESTADOS = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    canceled: 'Cancelada'
  };

  function estadoCita(status) {
    if (global.estadoCitaEs) return global.estadoCitaEs(status);
    return ESTADOS[status] || 'Pendiente';
  }

  function patientName(p) {
    if (!p) return 'Paciente';
    return p.name || p.fullName || ((p.firstName || '') + ' ' + (p.lastName || '')).trim() || 'Paciente';
  }

  function budgetTotal(b) {
    if (!b || !Array.isArray(b.treatments)) return 0;
    const sub = b.treatments.reduce(function (acc, t) {
      return acc + (Number(t.price) || 0) * (Number(t.qty) || 1);
    }, 0);
    const disc = Number(b.discount) || 0;
    return sub * (1 - disc / 100);
  }

  function budgetPaid(b) {
    if (!global.db || !b) return 0;
    const pays = global.db.getPayments(b.id) || [];
    return pays.reduce(function (acc, p) {
      return acc + (parseFloat(p.amount) || 0);
    }, 0);
  }

  function apptDay(a) {
    if (!a) return '';
    if (a.dateTime) return String(a.dateTime).slice(0, 10);
    return String(a.date || a.fecha || '').slice(0, 10);
  }

  function apptTime(a) {
    if (a.dateTime && a.dateTime.indexOf('T') !== -1) {
      return a.dateTime.split('T')[1].slice(0, 5);
    }
    return a.time || a.hora || '';
  }

  function resultOK(summary, data, citation) {
    const payload = Object.assign({ summary: summary }, data || {});
    return {
      ok: true,
      content: JSON.stringify(payload),
      citations: citation ? [citation] : []
    };
  }

  function preferSummary(content) {
    try {
      const o = JSON.parse(content);
      if (o && o.summary) return o.summary;
    } catch (_) { /* */ }
    return content;
  }

  function sanitize(text) {
    return String(text || '').replace(BANNED, 'Vito');
  }

  // ── Tools ─────────────────────────────────────────────
  const TOOLS = {
    list_appointments: {
      name: 'list_appointments',
      description: 'Consulta la agenda de una fecha. Si no se indica, la de mañana.',
      read_only: true,
      label: 'Citas del día',
      capability_id: 'credental.agenda.list_day',
      run: function (args) {
        const day = (args && args.date) || addDaysISO(1);
        const all = (global.db && global.db.getAppointments) ? global.db.getAppointments() : [];
        const rows = all.filter(function (a) { return apptDay(a) === day; });
        rows.sort(function (a, b) { return apptTime(a).localeCompare(apptTime(b)); });
        const lines = rows.map(function (a, i) {
          const pat = global.db.getPatient(a.patientId);
          const den = global.db.getDentist ? global.db.getDentist(a.dentistId) : null;
          return (i + 1) + '. ' + apptTime(a) + ' · ' + patientName(pat) +
            (den ? ' · ' + (den.name || '') : '') +
            (a.specialty ? ' · ' + a.specialty : '') +
            ' · ' + estadoCita(a.status);
        });
        const summary = rows.length
          ? 'Agenda del ' + fechaEs(day) + ' — ' + rows.length + (rows.length === 1 ? ' cita:' : ' citas:') + '\n' + lines.join('\n')
          : 'No hay citas agendadas para el ' + fechaEs(day) + '.';
        return resultOK(summary, { date: day, count: rows.length, appointments: rows.map(function (a) {
          return { id: a.id, dateTime: a.dateTime, patientId: a.patientId, status: a.status, specialty: a.specialty };
        }) }, {
          source: 'credental.appointments',
          label: 'Agenda · citas',
          detail: fechaCorta(day) + ' · ' + rows.length + (rows.length === 1 ? ' cita' : ' citas')
        });
      }
    },

    list_patients_balance: {
      name: 'list_patients_balance',
      description: 'Pacientes con saldo pendiente (presupuestos aceptados − abonos).',
      read_only: true,
      label: 'Saldos por cobrar',
      capability_id: 'credental.billing.balances',
      run: function (args) {
        const limit = (args && args.limit) || 15;
        const patients = (global.db && global.db.getPatients) ? global.db.getPatients() : [];
        const budgets = (global.db && global.db.getBudgets) ? global.db.getBudgets() : [];
        const byPatient = Object.create(null);

        budgets.forEach(function (b) {
          if (b.status && b.status !== 'accepted' && b.status !== 'aceptado') return;
          // Una cobranza cancelada o suspendida en Cobranzas deja de ser deuda.
          // Si Vito la siguiera contando, diría un número distinto del que la
          // pantalla de Cobranzas tiene delante del usuario.
          if (b.paymentStatus === 'cancelado' || b.paymentStatus === 'suspendido') return;
          const pid = b.patientId;
          if (!pid) return;
          const bal = Math.max(budgetTotal(b) - budgetPaid(b), 0);
          if (bal <= 0) return;
          byPatient[pid] = (byPatient[pid] || 0) + bal;
        });

        // El total se suma sobre TODOS los deudores, no sobre la lista
        // recortada: rotular como «en total» la suma de los 15 primeros
        // escondía la deuda del resto sin que nada lo delatara en pantalla.
        const todos = Object.keys(byPatient).map(function (pid) {
          const p = global.db.getPatient(pid);
          return { id: pid, name: patientName(p), balance: byPatient[pid] };
        }).sort(function (a, b) { return b.balance - a.balance; });

        const totalDeuda = todos.reduce(function (acc, p) { return acc + p.balance; }, 0);
        const owed = todos.slice(0, limit);

        const lines = owed.map(function (p, i) {
          return (i + 1) + '. ' + p.name + ' · saldo ' + money(p.balance);
        });
        const summary = todos.length
          ? 'Hay ' + todos.length + (todos.length === 1 ? ' paciente con saldo pendiente' : ' pacientes con saldo pendiente') +
            ' por ' + money(totalDeuda) + ' en total' +
            (todos.length > owed.length ? '. Los ' + owed.length + ' mayores:\n' : ':\n') + lines.join('\n')
          : 'Ningún presupuesto aceptado tiene saldo pendiente: la cobranza está al día.';
        return resultOK(summary, { count: todos.length, total: totalDeuda, patients: owed }, {
          source: 'credental.budgets.balance',
          label: 'Cobranzas · saldos',
          detail: todos.length + (todos.length === 1 ? ' paciente' : ' pacientes')
        });
      }
    },

    // Cobros del día, no «Facturación». Facturación guarda sus documentos en
    // localStorage bajo credental_docs_*, fuera de window.db: Vito no ve folios
    // CAI ni documentos fiscales, y la respuesta lo dice en voz alta en lugar
    // de prometer un dato que no puede consultar. La fuente es la misma que usa
    // Caja: abonos de Cobranzas cruzados con presupuestos para el nombre.
    daily_income: {
      name: 'daily_income',
      description: 'Cobros registrados en una fecha (abonos de Cobranzas). No incluye documentos fiscales.',
      read_only: true,
      label: 'Cobros del día',
      capability_id: 'credental.billing.daily_income',
      run: function (args) {
        const day = (args && args.date) || todayISO();
        const budgets = (global.db && global.db.getBudgets) ? global.db.getBudgets() : [];
        const porId = Object.create(null);
        budgets.forEach(function (b) { porId[b.id] = b; });

        const metodo = function (m) {
          const s = String(m || '').toLowerCase();
          if (s.indexOf('tarjeta') !== -1 || s.indexOf('card') !== -1) return 'Tarjeta';
          if (s.indexOf('transfer') !== -1) return 'Transferencia';
          return 'Efectivo';
        };

        const pagos = ((global.db && global.db.getPayments) ? global.db.getPayments() : [])
          .filter(function (p) { return porId[p.budgetId] && p.date === day; });

        const porMetodo = { Efectivo: 0, Tarjeta: 0, Transferencia: 0 };
        let total = 0;
        pagos.forEach(function (p) {
          const monto = parseFloat(p.amount) || 0;
          total += monto;
          porMetodo[metodo(p.method)] += monto;
        });

        const lineas = pagos.map(function (p) {
          const b = porId[p.budgetId];
          return '• ' + patientName(b ? global.db.getPatient(b.patientId) : null) +
            ' · ' + money(p.amount) + ' · ' + metodo(p.method);
        });

        const summary = pagos.length
          ? 'Cobros del ' + fechaEs(day) + ': ' + money(total) + ' en ' + pagos.length +
            (pagos.length === 1 ? ' abono.' : ' abonos.') + '\n' +
            'Efectivo ' + money(porMetodo.Efectivo) + ' · Tarjeta ' + money(porMetodo.Tarjeta) +
            ' · Transferencia ' + money(porMetodo.Transferencia) + '\n' + lineas.join('\n') +
            '\n\nEs lo que entró a caja, no los documentos fiscales emitidos: eso se consulta en Facturación.'
          : 'No se registraron cobros el ' + fechaEs(day) + '.';

        return resultOK(summary, {
          date: day, count: pagos.length, total: total, by_method: porMetodo
        }, {
          source: 'credental.payments',
          label: 'Caja · cobros del día',
          detail: fechaCorta(day) + ' · ' + money(total)
        });
      }
    },

    patient_summary: {
      name: 'patient_summary',
      description: 'Resume el expediente de un paciente por nombre o número de ficha.',
      read_only: true,
      label: 'Resumen de expediente',
      capability_id: 'credental.patients.summary',
      run: function (args) {
        const q = String((args && (args.query || args.name || args.id)) || '').trim().toLowerCase();
        if (!q) {
          return { ok: false, error: 'indica nombre o id', content: '{"error":"query required"}', citations: [] };
        }
        const patients = global.db.getPatients() || [];
        let p = patients.find(function (x) { return String(x.id).toLowerCase() === q; });
        if (!p) {
          p = patients.find(function (x) {
            return patientName(x).toLowerCase().indexOf(q) !== -1;
          });
        }
        if (!p) {
          return resultOK('No encontré un paciente que coincida con «' + q + '».', { found: false }, {
            source: 'credental.patients', label: 'Pacientes', detail: 'sin coincidencia'
          });
        }
        const appts = (global.db.getAppointments() || []).filter(function (a) { return a.patientId === p.id; });
        const budgets = (global.db.getBudgets() || []).filter(function (b) { return b.patientId === p.id; });
        let balance = 0;
        budgets.forEach(function (b) {
          if (b.status === 'accepted' || b.status === 'aceptado' || !b.status) {
            balance += Math.max(budgetTotal(b) - budgetPaid(b), 0);
          }
        });
        const proxima = appts
          .filter(function (a) { return apptDay(a) >= todayISO() && a.status !== 'canceled'; })
          .sort(function (a, b) { return (apptDay(a) + apptTime(a)).localeCompare(apptDay(b) + apptTime(b)); })[0];
        const summary =
          'Paciente: ' + patientName(p) + (p.phone ? ' · ' + p.phone : '') + '\n' +
          '• Citas registradas: ' + appts.length + '\n' +
          '• Próxima cita: ' + (proxima ? fechaEs(apptDay(proxima)) + ' a las ' + apptTime(proxima) : 'sin cita programada') + '\n' +
          '• Presupuestos: ' + budgets.length + '\n' +
          '• Saldo pendiente: ' + money(balance) +
          (p.motivoConsulta ? '\n• Motivo de consulta: ' + p.motivoConsulta : '');
        return resultOK(summary, {
          patient: { id: p.id, name: patientName(p) },
          appointments: appts.length,
          budgets: budgets.length,
          balance: balance
        }, {
          source: 'credental.patients.summary',
          label: 'Expediente · resumen',
          detail: patientName(p)
        });
      }
    },

    clinic_snapshot: {
      name: 'clinic_snapshot',
      description: 'Conteo de pacientes, citas y presupuestos de la clínica.',
      read_only: true,
      label: 'Panorama de la clínica',
      capability_id: 'credental.ops.snapshot',
      run: function () {
        const patients = global.db.getPatients() || [];
        const appointments = global.db.getAppointments() || [];
        const budgets = global.db.getBudgets() || [];
        const today = todayISO();
        const todayAppts = appointments.filter(function (a) { return apptDay(a) === today; });
        const summary =
          'Resumen de la clínica al ' + fechaEs(today) + ':\n' +
          '• Pacientes en el expediente: ' + patients.length + '\n' +
          '• Citas agendadas: ' + appointments.length + ' (hoy: ' + todayAppts.length + ')\n' +
          '• Presupuestos elaborados: ' + budgets.length;
        return resultOK(summary, {
          patients: patients.length,
          appointments: appointments.length,
          today_appointments: todayAppts.length,
          budgets: budgets.length
        }, {
          source: 'credental.local.snapshot',
          label: 'CREDental · expediente de la clínica',
          detail: fechaCorta(today)
        });
      }
    }
  };

  const CAPABILITIES = Object.keys(TOOLS).map(function (k) {
    const t = TOOLS[k];
    return {
      id: t.capability_id,
      label: t.label || t.name,
      name: t.name,
      description: t.description,
      kind: 'query',
      vito_tool: t.name,
      read_only: true
    };
  });

  function listTools() {
    return Object.keys(TOOLS).map(function (k) {
      return {
        name: TOOLS[k].name,
        description: TOOLS[k].description,
        read_only: TOOLS[k].read_only
      };
    });
  }

  function runTool(name, args) {
    const t = TOOLS[name];
    if (!t) {
      return {
        ok: false,
        error: 'herramienta no registrada: ' + name,
        content: JSON.stringify({ error: 'unknown tool' }),
        citations: []
      };
    }
    return t.run(args || {});
  }

  function ask(message) {
    const q = String(message || '').trim();
    if (!q) {
      return { reply: 'Escribe una pregunta para Vito.', citations: [], mock: true };
    }
    if (!global.db) {
      return {
        reply: 'La base de datos de CREDental no está lista. Recarga la página.',
        citations: [],
        mock: true
      };
    }

    const lower = q.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Si la pregunta nombra a un paciente del expediente, gana el expediente:
    // es lo que la persona está pidiendo, sin importar cómo redacte el resto.
    const pacientesDelExpediente = global.db.getPatients() || [];
    const normalizar = function (v) {
      return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };
    // Los nombres se guardan tal cual los teclea la recepción: un "(" o un "*"
    // dentro del nombre haría explotar el RegExp de abajo y, como este barrido
    // corre antes que el atajo de saludo, Vito dejaría de responder a todo.
    const escaparRegex = function (t) {
      return String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    let pacienteMencionado = pacientesDelExpediente.find(function (p) {
      const nombre = normalizar(patientName(p));
      if (lower.indexOf(nombre) !== -1) return true;
      const partes = nombre.split(' ').filter(function (t) { return t.length > 3; });
      return partes.length > 1 && lower.indexOf(partes[0]) !== -1 && lower.indexOf(partes[1]) !== -1;
    });

    // Segunda pasada: en la clínica se habla por apellido («cuánto debe la
    // señora Castro»). Solo vale si ese apellido identifica a un único
    // paciente; con dos coincidencias es mejor no adivinar.
    if (!pacienteMencionado) {
      const candidatos = pacientesDelExpediente.filter(function (p) {
        return normalizar(patientName(p)).split(' ').some(function (t) {
          return t.length > 3 && new RegExp('\\b' + escaparRegex(t) + '\\b').test(lower);
        });
      });
      if (candidatos.length === 1) pacienteMencionado = candidatos[0];
    }

    // Un saludo no es una consulta fallida: responderle con el aviso de «esa
    // consulta se sale de lo que puedo revisar» hace que el asistente se sienta
    // roto desde el primer mensaje.
    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|saludos|buen dia)\b/.test(lower)) {
      return {
        reply: 'Hola. Puedo revisar la agenda de un día, los saldos pendientes, ' +
          'el expediente de un paciente o el panorama de la clínica. ¿Qué necesitas?',
        citations: [], tool_calls: [], mock: true, hybrid: 'local'
      };
    }
    if (/^(gracias|muchas gracias|ok gracias|listo gracias)\b/.test(lower)) {
      return {
        reply: 'Con gusto. Aquí sigo si necesitas revisar algo más.',
        citations: [], tool_calls: [], mock: true, hybrid: 'local'
      };
    }

    // Preguntas sobre quién o qué es Vito. Se responden aquí, con la voz de la
    // clínica: si cayeran en la búsqueda de pacientes, el usuario recibiría un
    // «no encontré un paciente que coincida con inteligencia artificial».
    const IDENTIDAD = /(quien|que|cual)\s+(eres|sos)\b|te\s+llamas|tu\s+nombre|que\s+(modelo|motor)\b|eres\s+(un|una)\s+(ia|inteligencia|robot|bot|modelo|humano|persona|maquina)|inteligencia\s+artificial|chatgpt|open\s*ai|anthropic|gemini|copilot|deepseek|mistral|grok|\bgpt\b|\bclaude\b|\bia\b/;
    if (IDENTIDAD.test(lower)) {
      return {
        reply: sanitize('Soy Vito, el asistente de esta clínica dentro de CREDental. ' +
          'Trabajo únicamente con los datos guardados en este equipo: reviso la agenda, ' +
          'los saldos pendientes, el expediente de un paciente y el panorama general. ' +
          'Solo consulto información, nunca modifico expedientes ni cobros.'),
        citations: [],
        tool_calls: [],
        mock: true,
        hybrid: 'local'
      };
    }

    let toolName = null;
    let args = {};

    // Si la pregunta nombra a un paciente, la respuesta es sobre ESE paciente.
    // Antes se exigía además una palabra de una lista corta, y «¿qué
    // tratamientos tiene pendientes Lucía?» caía en la rama de saldos: se
    // preguntaba por una paciente y se exponía el saldo de las otras cinco.
    if (pacienteMencionado && /paciente|expediente|resum|ficha|historia|quien es|saldo de|debe|tratamiento|cita/.test(lower)) {
      toolName = 'patient_summary';
      args = { query: patientName(pacienteMencionado) };
    // El dinero va antes que la agenda. Los tokens desnudos `hoy` y `manana`
    // de la rama de citas secuestraban «¿cuánto cobramos hoy?»; quitarlos de
    // allí rompería «¿qué tengo hoy?», así que se resuelve por orden.
    } else if (/\bfactur|\bingres|cobramos|cobrado|\bcobro\b|recaud|entro en caja|caja del dia/.test(lower)) {
      const dia = fechaPedida(lower);
      // Los cobros se consultan por día. Si la pregunta pide un mes, una
      // semana o un año y no nombra ninguna fecha concreta, se dice el límite
      // en vez de contestar por hoy: sustituir el periodo en silencio es
      // responder con seguridad una pregunta que nadie hizo.
      if (!dia && /\bmes\b|\bmeses\b|mensual|\bsemana|semanal|\bano\b|\banual|quincen|trimestr|acumulad|historic/.test(lower)) {
        return {
          reply: 'Puedo consultar los cobros de un día concreto, no de un periodo completo. ' +
            'Pregúntame por ejemplo «¿cuánto cobramos hoy?» o «¿cuánto se cobró el 25 de agosto?». ' +
            'El acumulado del mes está en Reportes.',
          citations: [], tool_calls: [], mock: true, hybrid: 'local'
        };
      }
      toolName = 'daily_income';
      args = { date: dia || todayISO() };
    } else if (/saldo|pendiente|debe|cobranz|cobrar|mora|deuda/.test(lower)) {
      toolName = 'list_patients_balance';
    } else if (/cita|agenda|consulta de|manana|hoy|programad/.test(lower)) {
      toolName = 'list_appointments';
      args = { date: fechaPedida(lower) || addDaysISO(1) };
    // El panorama va antes que el expediente: «resumen de la clínica» contiene
    // «resum» y terminaba buscando un paciente llamado «la clínica».
    } else if (/clinica|resumen general|panorama|como vamos|cuantos|cuantas|indicadores|estadistica/.test(lower)) {
      toolName = 'clinic_snapshot';
    } else if (/paciente|expediente|resum|ficha|historia|quien es/.test(lower)) {
      toolName = 'patient_summary';
      const m = q.match(/(?:paciente|expediente de|ficha de|de)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ ]{2,40})/i);
      args = { query: pacienteMencionado ? patientName(pacienteMencionado) : (m ? m[1].trim() : q) };
    }

    // Sin coincidencia no se inventa una respuesta ni se contesta otra cosa:
    // se dice con claridad qué sí puede consultar.
    if (!toolName) {
      const opciones = Object.keys(TOOLS).map(function (k) {
        return '• ' + TOOLS[k].label + ' — ' + TOOLS[k].description;
      }).join('\n');
      return {
        reply: 'Esa consulta se sale de lo que puedo revisar en el sistema. Puedo ayudarte con:\n' +
          opciones + '\n\nPor ejemplo: «¿Qué citas hay mañana?» o «¿Quién tiene saldo pendiente?».',
        citations: [],
        tool_calls: [],
        mock: true,
        hybrid: 'local'
      };
    }

    const result = runTool(toolName, args);
    const reply = sanitize(
      result.ok
        ? preferSummary(result.content)
        : ('No pude consultar los datos: ' + (result.error || 'error'))
    );
    return {
      reply: reply,
      citations: result.citations || [],
      tool_calls: [{ name: toolName, arguments: args }],
      mock: true,
      hybrid: 'local'
    };
  }

  function status() {
    const enabled = !!global.db;
    return {
      assistant: 'Vito',
      enabled: enabled,
      ready: enabled,
      message: enabled
        ? 'Módulo CREDental activo en modo local-first para la demostración.'
        : 'Sin motor de datos.',
      hybrid: 'local-first'
    };
  }

  const moduleDef = {
    id: 'credental',
    name: 'CREDental',
    version: '0.2.0',
    description: 'Agenda, pacientes, presupuestos y cobranzas para clínicas dentales.',
    capabilities: CAPABILITIES,
    listTools: listTools,
    registerVitoTools: function () { /* tools viven en VitoCredental */ return listTools(); }
  };

  // API pública (compat + módulo)
  global.VitoCredental = {
    status: status,
    listTools: listTools,
    runTool: runTool,
    ask: ask,
    sanitize: sanitize,
    module: moduleDef
  };

  if (global.Modkit && global.Modkit.catalog) {
    try {
      global.Modkit.catalog.register(moduleDef);
    } catch (e) {
      // re-register after reload
      if (String(e.message || e).indexOf('duplicado') !== -1) {
        global.Modkit.catalog._byId[moduleDef.id] = moduleDef;
      }
    }
  }
})(window);
