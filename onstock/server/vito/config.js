// Traducción de modules/vito/config.go + dotenv.go.
//
// El nombre del proveedor no aparece en las variables que edita quien instala
// el producto: el motor es intercambiable y el mensaje de error que sale al
// arrancar se lee en la misma ventana que mira el dueño del negocio. Las
// variables VITO_OPENCODE_* / OPENCODE_API_KEY siguen funcionando como alias
// para no romper los .env que ya existen.
import fs from 'node:fs';
import { Service } from './service.js';
import { ProveedorLocal } from './proveedorLocal.js';
import { ProveedorNube, BASE_URL_POR_DEFECTO, MODELO_POR_DEFECTO } from './proveedorNube.js';

export const EnvEnabled = 'VITO_ENABLED';
export const EnvProvider = 'VITO_PROVIDER'; // local | nube (alias: mock | opencode)
export const EnvAPIKey = 'VITO_API_KEY';
export const EnvBaseURL = 'VITO_BASE_URL';
export const EnvModel = 'VITO_MODEL';
export const EnvLocale = 'VITO_LOCALE';

// loadDotEnv lee un .env simple KEY=VALUE sin pisar lo que ya esté en el
// entorno. Un archivo inexistente no es error.
export function loadDotEnv(path) {
  let raw;
  try {
    raw = fs.readFileSync(path, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  for (let line of raw.split('\n')) {
    line = line.trim();
    if (line === '' || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (val.length >= 2
      && ((val[0] === '"' && val.at(-1) === '"') || (val[0] === "'" && val.at(-1) === "'"))) {
      val = val.slice(1, -1);
    }
    if (key === '') continue;
    if (key in process.env) continue;
    process.env[key] = val;
  }
}

export function loadDotEnvFiles(...paths) {
  for (const p of paths) {
    try {
      loadDotEnv(p);
    } catch { /* un .env ilegible no impide arrancar */ }
  }
}

function env(k) { return process.env[k] ?? ''; }

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s !== '') return s;
  }
  return '';
}

function envBool(key, def) {
  const v = env(key).trim();
  if (v === '') return def;
  switch (v.toLowerCase()) {
    case '1': case 'true': case 't': case 'yes': case 'y': case 'on': case 'si': case 'sí':
      return true;
    case '0': case 'false': case 'f': case 'no': case 'n': case 'off':
      return false;
    default:
      return def;
  }
}

// normalizeProvider acepta los nombres neutros que se documentan ("local" y
// "nube") y los históricos ("mock" y "opencode"), que siguen siendo los valores
// internos. Así el .env del cliente no menciona a ningún proveedor y los
// archivos que ya estaban escritos siguen arrancando igual.
function normalizeProvider(p) {
  switch (p) {
    case 'local': case 'offline': case 'mock': return 'mock';
    case 'nube': case 'cloud': case 'api': case 'opencode': return 'opencode';
    default: return p;
  }
}

function isPlaceholderKey(k) {
  const s = String(k ?? '').trim().toLowerCase();
  if (s === '') return true;
  if (s.includes('pega_tu') || s.includes('your_key')) return true;
  return ['pega_tu_key_aqui', 'your_api_key', 'tu_key', 'tu_key_real_aqui',
    'changeme', 'xxx', 'sk-xxx', 'sk-...', 'replace_me'].includes(s);
}

export function loadEnvConfig() {
  const cfg = {
    enabled: envBool(EnvEnabled, true),
    provider: normalizeProvider(env(EnvProvider).trim().toLowerCase()),
    locale: env(EnvLocale).trim(),
    apiKey: firstNonEmpty(env(EnvAPIKey), env('VITO_OPENCODE_API_KEY'), env('OPENCODE_API_KEY')),
    baseURL: firstNonEmpty(env(EnvBaseURL), env('VITO_OPENCODE_BASE_URL')),
    model: firstNonEmpty(env(EnvModel), env('VITO_MODELO'), env('VITO_OPENCODE_MODEL')),
  };
  // Rechaza los textos de ejemplo copiados del .env.example.
  if (isPlaceholderKey(cfg.apiKey)) cfg.apiKey = '';
  if (cfg.provider === '') {
    // Automático: con clave viva → nube; si no, local (seguro sin conexión).
    cfg.provider = cfg.apiKey !== '' ? 'opencode' : 'mock';
  }
  if (cfg.locale === '') cfg.locale = 'es-HN';
  if (cfg.baseURL === '') cfg.baseURL = BASE_URL_POR_DEFECTO;
  if (cfg.model === '') cfg.model = MODELO_POR_DEFECTO;
  return cfg;
}

export function newProvider(cfg) {
  switch (cfg.provider) {
    case 'mock':
    case '':
      return new ProveedorLocal();
    case 'opencode':
      if (cfg.apiKey === '' || isPlaceholderKey(cfg.apiKey)) {
        throw new Error(
          `falta la clave del motor. En el archivo .env del producto pon ${EnvAPIKey}=<tu clave> `
          + 'en una sola línea y sin comillas (no dejes el texto de ejemplo). '
          + 'Sin ella Vito sigue funcionando en modo local',
        );
      }
      return new ProveedorNube({ apiKey: cfg.apiKey, baseURL: cfg.baseURL, model: cfg.model });
    default:
      throw new Error(`motor ${JSON.stringify(cfg.provider)} desconocido (usa "local" o "nube")`);
  }
}

// newServiceFromEnv construye el servicio con la configuración del entorno.
// Devuelve {svc, cfg, err}: ante una mala configuración cae al motor local para
// que la aplicación nunca deje de arrancar, y entrega el error para que el
// anfitrión decida qué imprimir.
export function newServiceFromEnv(tools) {
  const cfg = loadEnvConfig();
  let prov;
  try {
    prov = newProvider(cfg);
  } catch (err) {
    prov = new ProveedorLocal();
    const svc = new Service({ enabled: cfg.enabled, locale: cfg.locale }, prov, tools);
    return { svc, cfg, err: new Error(`Vito quedó en modo local: ${err.message}`) };
  }
  const svc = new Service({ enabled: cfg.enabled, locale: cfg.locale }, prov, tools);
  return { svc, cfg, err: null };
}
