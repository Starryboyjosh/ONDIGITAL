# Seguridad: demo → producción (Fase 4.1)

Estado honesto para no confundir prototipo con producto vendible.

## Hoy (aceptable en demo / piloto controlado)

| Área | OnStock | Credental |
|------|---------|-----------|
| Auth | Sin login multi-usuario (PC de tienda) | sessionStorage + hash demo |
| Datos | SQLite local en `data/` | sessionStorage (Firebase no se carga) |
| Aislamiento | 1 instancia = 1 negocio | `companyId` en datos |
| Backups | `make backup` / `-backup` | copiar export / sync cloud |
| Vito keys | Solo `.env` servidor | tools locales sin key en browser |

## Antes de producción con datos reales

- [ ] Auth real (sesiones servidor / JWT / proveedor) y roles aplicados en API
- [ ] Credental: no depender de sessionStorage como única fuente de verdad clínica
- [x] Reglas Firebase que validen tenant en cada lectura/escritura —
      `firebase/firestore.rules`, verificadas contra el emulador con
      `firebase/pruebas/ejecutar.sh` (30 casos). **Necesarias, no suficientes:**
      ver "Firestore" abajo para las tres piezas que faltan.
- [ ] Cifrado en tránsito (HTTPS) y backups automáticos probados
- [ ] Política de PII si Vito usa API en la nube (Enterprise AI)
- [ ] Rotación de keys; nunca keys en el frontend

## Firestore

Lo que había en `firebase/firestore.rules` era la plantilla que genera la
consola de Firebase, intacta:

```
allow read, write: if request.time < timestamp.date(2026, 7, 1);
```

Eso no es una regla de seguridad, es un temporizador. Sin ninguna comprobación
de identidad: hasta esa fecha cualquiera con el `projectId` podía leer,
escribir o borrar la base entera; pasada la fecha deniega todo y la app falla
sin explicación. Las dos mitades son malas, y la fecha ya pasó.

Ahora es **denegar por defecto con aislamiento por inquilino** sobre
`/clinicas/{clinicaId}/<colección>/{documento}`:

- Sin sesión no se lee ni se escribe nada.
- Con sesión, solo se accede a la clínica que dice el custom claim `clinicaId`.
- La escritura depende del rol (ver abajo). La lectura la tienen los cuatro.
- `usuarios` es de solo lectura —la ficha propia siempre, el directorio solo
  `admin` y `gerente`— y **nadie la escribe desde el navegador, ni el admin**:
  si un gerente pudiera tocar esa colección podría ascenderse a admin, que es
  justo la escalada que estas reglas existen para impedir.
- La historia clínica no se borra desde el cliente; se anula por estado, igual
  que las ventas de OnStock.
- Una colección que no esté en la lista explícita queda cerrada: crear una
  colección nueva no la abre por accidente.

**Esto no basta por sí solo.** Antes de que un dato clínico real toque
Firestore faltan tres piezas, y ninguna vive en el archivo de reglas:

1. **Firebase Authentication de verdad en Credental.** Hoy la sesión es
   `sessionStorage` + hash demo, no una identidad verificable.
2. **Los claims `clinicaId` y `rol` firmados por un backend de confianza**
   (Admin SDK). Un claim que el cliente pueda escribir no aísla nada: la regla
   entera se apoya en que ese claim sea inmutable para el navegador.
3. **Alta y baja de clínicas y usuarios fuera del navegador.** Las reglas lo
   prohíben a propósito; hace falta la contraparte administrativa.

Detalle operativo y comandos: `firebase/README.md`.

## Roles (modelo)

Ver `ondigital.hn/tenant` (`modules/tenant/plan.go`): `admin` · `gerente` ·
`empleado` · `viewer`, con la matriz de `RolePermissions`:

| Rol | Permisos |
|-----|----------|
| `admin` | todo |
| `gerente` | leer, escribir, reportes, usuarios |
| `empleado` | leer, escribir |
| `viewer` | leer |

Las reglas de Firestore **espejan esa matriz en vez de inventar una propia**,
incluido su `default`: un rol ausente o desconocido cae a solo lectura. Si la
matriz cambia en Go, `firebase/firestore.rules` y sus pruebas cambian con ella.

Enforcement completo en APIs: pendiente de endurecer por suite; la matriz ya está definida
en código para no reinventar en cada pantalla.
