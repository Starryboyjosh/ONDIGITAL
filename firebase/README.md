# firebase/ — reglas e índices de Firestore

Esta carpeta contiene **solo la configuración de la base de datos**. No publica
ninguna web.

> **Esta carpeta no es el hosting del sitio.** La landing se despliega desde
> `Pagina_Web_Original/`, al proyecto `ondigital-landing`, y **su URL no puede
> cambiar**: hay un QR impreso apuntando a ella. Nada de lo que hagas aquí toca
> ese despliegue, y `firebase deploy` desde aquí nunca publica hosting — mira
> `firebase.json`: solo declara `firestore`.

## Qué hay

| Archivo | Para qué |
|---|---|
| `firebase.json` | Apunta a las reglas y a los índices. Solo `firestore`. |
| `firestore.rules` | Las reglas de seguridad. Denegar por defecto. |
| `firestore.indexes.json` | Índices compuestos. Hoy vacío: no hay consultas que los necesiten. |
| `.firebaserc` | **Sin proyecto a propósito** (ver abajo). |
| `pruebas/` | Verificación de las reglas contra el emulador. |

## Estado real (beta)

Ningún producto de este repositorio habla con Firestore hoy:

- **Credental** es local-first sobre `sessionStorage` — lo documenta
  `credental/js/data-hybrid.js`, y ninguna página carga un conector cloud.
- **OnStock** guarda en SQLite local.
- **OnRoute** guarda en el dispositivo.

Así que estas reglas no rompen nada: **dibujan la frontera antes de que exista
tráfico**, que es el único momento barato para hacerlo.

Lo que había antes era la plantilla que genera la consola de Firebase:

```
allow read, write: if request.time < timestamp.date(2026, 7, 1);
```

Eso no es una regla de seguridad, es un temporizador. Sin ninguna comprobación
de identidad, cualquiera con el `projectId` podía leer, escribir o borrar la
base entera hasta esa fecha; pasada la fecha, deniega todo y la app falla sin
explicación. Las dos mitades son malas.

## La postura ahora

Denegar por defecto, y aislamiento por inquilino sobre este modelo:

```
/clinicas/{clinicaId}/<colección>/{documento}
```

- Sin sesión no se lee ni se escribe nada.
- Con sesión, solo se accede a la clínica que dice el **custom claim
  `clinicaId`** del token.
- El directorio `usuarios` es de solo lectura y solo la ficha propia: cambiar
  roles desde el navegador sería escalar privilegios contra estas mismas reglas.
- La historia clínica no se borra desde el cliente. Los módulos anulan por
  estado, igual que OnStock con las ventas.
- Una colección que no esté en la lista explícita de `firestore.rules` queda
  cerrada. Crear una colección nueva no la abre por accidente.

### Lo que falta antes de que esto sostenga datos reales

Estas reglas son necesarias pero no suficientes. Antes de que un dato clínico
real toque Firestore hacen falta además:

1. **Firebase Authentication de verdad en Credental.** Hoy la sesión es demo
   (`sessionStorage`), no una identidad verificable.
2. **Que el claim `clinicaId` lo firme un backend de confianza** (Admin SDK).
   Un claim que el cliente pueda escribir no aísla absolutamente nada.
3. **Alta y baja de clínicas y usuarios fuera del navegador.** Las reglas lo
   prohíben a propósito; hace falta la contraparte administrativa.

## Verificar

```bash
./pruebas/ejecutar.sh
```

Levanta el emulador de Firestore con estas reglas contra el proyecto ficticio
`demo-ondigital`, corre 17 casos (anónimo, miembro, vecino de otra clínica,
sesión sin claim) y apaga el emulador. No toca ningún proyecto real ni necesita
credenciales.

Las pruebas están comprobadas por mutación: quitar el aislamiento por inquilino
tumba 6 casos, y meter `usuarios` en la lista de colecciones operativas tumba 2
—los permisos se **suman** entre reglas que coinciden con la misma ruta, así
que esa exclusión no es decorativa.

Requiere `firebase-tools`, Java (el emulador es un `.jar`) y `python3`. Si
falta alguno, el script lo dice y sale con error en vez de fingir que pasó.

## Desplegar

`.firebaserc` está **sin proyecto a propósito**, para que un `firebase deploy`
distraído no publique reglas sobre una base que no era. Hay que nombrar el
proyecto en el comando:

```bash
firebase deploy --only firestore:rules --project <id-del-proyecto>
```

Y antes de desplegar, correr `./pruebas/ejecutar.sh`. Una regla rota en
Firestore no da error de compilación en producción: simplemente deja pasar, o
deja de pasar, a todo el mundo.
