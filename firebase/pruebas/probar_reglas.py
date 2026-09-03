"""Pruebas de las reglas de Firestore contra el emulador.

No se ejecuta solo: lo levanta `ejecutar.sh`, que arranca el emulador con
`firebase/firestore.rules` y le pasa el puerto por FIRESTORE_EMULATOR_PORT.

Cómo lee los resultados: el emulador responde 403 cuando las reglas deniegan y
200/404 cuando las dejan pasar (404 = permitido pero el documento no existe).
Por eso `permitido` agrupa 200 y 404: distingue "las reglas dijeron que no" de
"las reglas dijeron que sí y no había nada ahí".

Los tokens van sin firmar a propósito: el emulador acepta JWT sin verificar y
lee los custom claims del nivel superior del payload. Contra Firestore real
esos tokens no valen nada; aquí sirven para representar "usuario u1 de la
clínica c1" sin montar Authentication.

Los roles usan el vocabulario de `modules/tenant/plan.go` (`admin`, `gerente`,
`empleado`, `viewer`): las reglas espejan esa matriz en vez de inventar una.

Verificado por mutación: quitar el aislamiento por inquilino de las reglas
tumba varios casos, y meter `usuarios` en la lista de colecciones operativas
tumba otros dos (los permisos se suman entre reglas que coinciden con la misma
ruta, así que esa exclusión no es decorativa).
"""

import base64, json, os, time, urllib.request, urllib.error, sys

PUERTO = os.environ.get("FIRESTORE_EMULATOR_PORT", "8391")
HOST = f"http://127.0.0.1:{PUERTO}"
PROJ = "demo-ondigital"
BASE = f"{HOST}/v1/projects/{PROJ}/databases/(default)/documents"

def b64(o):
    return base64.urlsafe_b64encode(json.dumps(o, separators=(',', ':')).encode()).rstrip(b'=').decode()

def token(uid, **claims):
    """El emulador acepta JWT sin firmar; los claims van al nivel superior."""
    now = int(time.time())
    payload = {"iss": f"https://securetoken.google.com/{PROJ}", "aud": PROJ,
               "auth_time": now, "user_id": uid, "sub": uid, "iat": now,
               "exp": now + 3600, "firebase": {"identities": {}, "sign_in_provider": "custom"}}
    payload.update(claims)
    return f"{b64({'alg':'none','typ':'JWT'})}.{b64(payload)}."

def pedir(metodo, ruta, auth=None, cuerpo=None):
    req = urllib.request.Request(BASE + ruta, method=metodo)
    if auth:
        req.add_header("Authorization", "Bearer " + auth)
    data = None
    if cuerpo is not None:
        data = json.dumps(cuerpo).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data, timeout=15) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        return f"ERR {e}"

OWNER = "owner"  # bypass de reglas, solo para sembrar
DOC = {"fields": {"nombre": {"stringValue": "prueba"}}}

# --- Semilla (sin reglas) ---
for ruta in ["/clinicas/c1", "/clinicas/c2",
             "/clinicas/c1/pacientes/p1", "/clinicas/c2/pacientes/p9",
             "/clinicas/c1/usuarios/u1", "/clinicas/c1/usuarios/u2",
             "/clinicas/c1/secretos/s1", "/publico/x1"]:
    pedir("PATCH", ruta, OWNER, DOC)

# Roles del vocabulario de `modules/tenant/plan.go`.
u1_c1     = token("u1", clinicaId="c1", rol="empleado")
admin_c1  = token("u1", clinicaId="c1", rol="admin")
gerente_c1 = token("ug", clinicaId="c1", rol="gerente")
viewer_c1 = token("uv", clinicaId="c1", rol="viewer")
sin_rol   = token("u1", clinicaId="c1")            # sin claim `rol`
rol_raro  = token("u1", clinicaId="c1", rol="jefazo")
u9_c2     = token("u9", clinicaId="c2", rol="admin")
sin_claim = token("uX", rol="admin")               # rol sí, clínica no

CASOS = [
    # (nombre, metodo, ruta, auth, cuerpo, esperado_permitido)
    ("anónimo NO lee un paciente",            "GET",    "/clinicas/c1/pacientes/p1", None,      None, False),
    ("anónimo NO escribe un paciente",        "PATCH",  "/clinicas/c1/pacientes/px", None,      DOC,  False),
    ("miembro SÍ lee su paciente",            "GET",    "/clinicas/c1/pacientes/p1", u1_c1,     None, True),
    ("miembro SÍ crea en su clínica",         "PATCH",  "/clinicas/c1/pacientes/p2", u1_c1,     DOC,  True),
    ("miembro NO lee otra clínica",           "GET",    "/clinicas/c2/pacientes/p9", u1_c1,     None, False),
    ("miembro NO escribe en otra clínica",    "PATCH",  "/clinicas/c2/pacientes/p8", u1_c1,     DOC,  False),
    ("vecino NO lee la clínica ajena",        "GET",    "/clinicas/c1/pacientes/p1", u9_c2,     None, False),
    ("sin claim clinicaId NO lee nada",       "GET",    "/clinicas/c1/pacientes/p1", sin_claim, None, False),
    ("miembro NO borra historia clínica",     "DELETE", "/clinicas/c1/pacientes/p1", u1_c1,     None, False),
    ("miembro SÍ ve el perfil de su clínica", "GET",    "/clinicas/c1",              u1_c1,     None, True),
    ("miembro NO ve otra clínica",            "GET",    "/clinicas/c2",              u1_c1,     None, False),
    ("miembro SÍ ve su propia ficha",         "GET",    "/clinicas/c1/usuarios/u1",  u1_c1,     None, True),
    ("miembro NO ve la ficha de otro",        "GET",    "/clinicas/c1/usuarios/u2",  u1_c1,     None, False),
    ("nadie se auto-asciende de rol",         "PATCH",  "/clinicas/c1/usuarios/u1",  u1_c1,     DOC,  False),
    ("colección no listada queda cerrada",    "GET",    "/clinicas/c1/secretos/s1",  u1_c1,     None, False),
    ("fuera de /clinicas queda cerrado",      "GET",    "/publico/x1",               u1_c1,     None, False),
    ("listar pacientes de otra clínica NO",   "GET",    "/clinicas/c2/pacientes",    u1_c1,     None, False),

    # --- Matriz de roles (espeja RolePermissions de modules/tenant/plan.go) ---
    ("viewer SÍ lee",                         "GET",    "/clinicas/c1/pacientes/p1", viewer_c1,  None, True),
    ("viewer NO escribe",                     "PATCH",  "/clinicas/c1/pacientes/p3", viewer_c1,  DOC,  False),
    ("empleado SÍ escribe",                   "PATCH",  "/clinicas/c1/pacientes/p4", u1_c1,      DOC,  True),
    ("gerente SÍ escribe",                    "PATCH",  "/clinicas/c1/pacientes/p5", gerente_c1, DOC,  True),
    ("admin SÍ escribe",                      "PATCH",  "/clinicas/c1/pacientes/p6", admin_c1,   DOC,  True),
    ("sin claim rol SÍ lee",                  "GET",    "/clinicas/c1/pacientes/p1", sin_rol,    None, True),
    ("sin claim rol NO escribe",              "PATCH",  "/clinicas/c1/pacientes/p7", sin_rol,    DOC,  False),
    ("rol desconocido NO escribe",            "PATCH",  "/clinicas/c1/pacientes/p8", rol_raro,   DOC,  False),
    ("gerente SÍ ve el directorio",           "GET",    "/clinicas/c1/usuarios",     gerente_c1, None, True),
    ("empleado NO ve el directorio",          "GET",    "/clinicas/c1/usuarios",     u1_c1,      None, False),
    ("gerente SÍ ve la ficha de otro",        "GET",    "/clinicas/c1/usuarios/u2",  gerente_c1, None, True),
    ("ni el admin escribe usuarios",          "PATCH",  "/clinicas/c1/usuarios/u2",  admin_c1,   DOC,  False),
    ("admin tampoco borra historia clínica",  "DELETE", "/clinicas/c1/pacientes/p1", admin_c1,   None, False),
]

fallos = 0
for nombre, metodo, ruta, auth, cuerpo, esperado in CASOS:
    code = pedir(metodo, ruta, auth, cuerpo)
    permitido = code in (200, 404)   # 403 = denegado por reglas; 404 = reglas OK, doc ausente
    ok = permitido == esperado
    if not ok:
        fallos += 1
    print(f"{'ok  ' if ok else 'FALLA'} {nombre:42s} http={code} permitido={permitido} esperado={esperado}")

print()
print(f"{len(CASOS)-fallos}/{len(CASOS)} casos correctos")
sys.exit(1 if fallos else 0)
