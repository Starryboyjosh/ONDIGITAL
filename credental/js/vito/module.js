/* ==========================================================================
   Módulo Credental (modkit) + tools Vito
   Capacidades agenda / pacientes / cobranzas · datos vía window.db (híbrido)
   ========================================================================== */
(function (global) {
  'use strict';

  const BANNED = /claude|chatgpt|openai|opencode|gpt-4|anthropic|nemotron/i;

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
      description: 'Lista citas del día (YYYY-MM-DD). Default: mañana.',
      read_only: true,
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
            (a.status ? ' (' + a.status + ')' : '');
        });
        const summary = rows.length
          ? 'Citas del ' + day + ' (' + rows.length + '):\n' + lines.join('\n')
          : 'No hay citas registradas para el ' + day + '.';
        return resultOK(summary, { date: day, count: rows.length, appointments: rows.map(function (a) {
          return { id: a.id, dateTime: a.dateTime, patientId: a.patientId, status: a.status, specialty: a.specialty };
        }) }, {
          source: 'credental.appointments',
          label: 'Agenda · citas',
          detail: day + ' · ' + rows.length + ' cita(s)'
        });
      }
    },

    list_patients_balance: {
      name: 'list_patients_balance',
      description: 'Pacientes con saldo pendiente (presupuestos aceptados − abonos).',
      read_only: true,
      capability_id: 'credental.billing.balances',
      run: function (args) {
        const limit = (args && args.limit) || 15;
        const patients = (global.db && global.db.getPatients) ? global.db.getPatients() : [];
        const budgets = (global.db && global.db.getBudgets) ? global.db.getBudgets() : [];
        const byPatient = Object.create(null);

        budgets.forEach(function (b) {
          if (b.status && b.status !== 'accepted' && b.status !== 'aceptado') return;
          const pid = b.patientId;
          if (!pid) return;
          const bal = Math.max(budgetTotal(b) - budgetPaid(b), 0);
          if (bal <= 0) return;
          byPatient[pid] = (byPatient[pid] || 0) + bal;
        });

        const owed = Object.keys(byPatient).map(function (pid) {
          const p = global.db.getPatient(pid);
          return { id: pid, name: patientName(p), balance: byPatient[pid] };
        }).sort(function (a, b) { return b.balance - a.balance; }).slice(0, limit);

        const lines = owed.map(function (p, i) {
          return (i + 1) + '. ' + p.name + ' · saldo ' + money(p.balance);
        });
        const summary = owed.length
          ? 'Pacientes con saldo pendiente (' + owed.length + '):\n' + lines.join('\n')
          : 'No hay saldos pendientes en presupuestos aceptados.';
        return resultOK(summary, { count: owed.length, patients: owed }, {
          source: 'credental.budgets.balance',
          label: 'Cobranzas · saldos',
          detail: owed.length + ' paciente(s)'
        });
      }
    },

    patient_summary: {
      name: 'patient_summary',
      description: 'Resume expediente de un paciente por nombre o id.',
      read_only: true,
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
        const summary =
          'Paciente: ' + patientName(p) + (p.phone ? ' · ' + p.phone : '') + '\n' +
          '• Citas registradas: ' + appts.length + '\n' +
          '• Presupuestos: ' + budgets.length + '\n' +
          '• Saldo pendiente: ' + money(balance) +
          (p.motivoConsulta ? '\n• Motivo: ' + p.motivoConsulta : '');
        return resultOK(summary, {
          patient: { id: p.id, name: patientName(p) },
          appointments: appts.length,
          budgets: budgets.length,
          balance: balance
        }, {
          source: 'credental.patients.summary',
          label: 'Expediente · resumen',
          detail: p.id
        });
      }
    },

    clinic_snapshot: {
      name: 'clinic_snapshot',
      description: 'Conteos de pacientes, citas y presupuestos del tenant local.',
      read_only: true,
      capability_id: 'credental.ops.snapshot',
      run: function () {
        const patients = global.db.getPatients() || [];
        const appointments = global.db.getAppointments() || [];
        const budgets = global.db.getBudgets() || [];
        const today = todayISO();
        const todayAppts = appointments.filter(function (a) { return apptDay(a) === today; });
        const summary =
          'Resumen de la clínica (datos locales / híbridos):\n' +
          '• Pacientes: ' + patients.length + '\n' +
          '• Citas totales: ' + appointments.length + ' (hoy: ' + todayAppts.length + ')\n' +
          '• Presupuestos: ' + budgets.length + '\n' +
          '• Fecha: ' + today;
        return resultOK(summary, {
          patients: patients.length,
          appointments: appointments.length,
          today_appointments: todayAppts.length,
          budgets: budgets.length
        }, {
          source: 'credental.local.snapshot',
          label: 'CREDental · datos locales',
          detail: 'local-first'
        });
      }
    }
  };

  const CAPABILITIES = Object.keys(TOOLS).map(function (k) {
    const t = TOOLS[k];
    return {
      id: t.capability_id,
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

    const lower = q.toLowerCase();
    let toolName = 'clinic_snapshot';
    let args = {};

    if (/cita|agenda|mañana|manana|hoy/.test(lower)) {
      toolName = 'list_appointments';
      args = { date: /hoy/.test(lower) ? todayISO() : addDaysISO(1) };
    } else if (/saldo|pendiente|debe|cobranza|pago|cobrar/.test(lower)) {
      toolName = 'list_patients_balance';
    } else if (/paciente|expediente|resume|resumen del|quién es|quien es/.test(lower)) {
      toolName = 'patient_summary';
      // extract rough name after "de" / "paciente"
      const m = q.match(/(?:paciente|de|expediente de)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ ]{2,40})/i);
      args = { query: m ? m[1].trim() : q };
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
