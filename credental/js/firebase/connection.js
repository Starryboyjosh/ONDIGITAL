/* ==========================================================================
   CONNECTION.JS - CONECTOR OPCIONAL A GOOGLE FIRESTORE

   Credental es local-first: opera sin red sobre sessionStorage. Este conector
   es un extra opt-in y NO se carga en ninguna página del prototipo.

   Reglas de uso:
   1. La configuración del proyecto NO vive en el código fuente. Se lee de
      `window.CREDENTAL_FIREBASE_CONFIG`, que debe declararse en un archivo
      `js/firebase/config.local.js` (ignorado por git) creado a partir de
      `js/firebase/config.example.js`.
   2. Sin configuración, el conector no se registra: `window.firebaseConnector`
      queda sin definir y `js/db.js` sigue trabajando solo en local.
   3. El SDK se descarga con `integrity` (SRI) fijado a la versión 10.8.0.
      Si se sube de versión hay que recalcular los hashes:
         curl -s https://www.gstatic.com/firebasejs/<v>/<archivo> \
           | openssl dgst -sha384 -binary | openssl base64 -A
   ========================================================================== */

(function() {
  const SDK_VERSION = '10.8.0';
  const SDK_FILES = [
    {
      src: 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/firebase-app-compat.js',
      integrity: 'sha384-4gq9w/AGf72FXdNQ3Kn3EqWP7633NbCMjpYHt8YCZyXf23o2opcuAr4cif41tLrC'
    },
    {
      src: 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/firebase-firestore-compat.js',
      integrity: 'sha384-Qgqc/HETq5lqJnRDqWnV1AZGw3pgMYNUVaqLLN1W/55XuWK94epwbCQrOvdoh1Zo'
    }
  ];

  // La configuración la aporta el despliegue, nunca este archivo.
  const firebaseConfig = window.CREDENTAL_FIREBASE_CONFIG || null;
  const configuracionValida = !!(firebaseConfig && firebaseConfig.projectId && firebaseConfig.apiKey);

  if (!configuracionValida) {
    console.info(
      'Credental: sincronización en la nube desactivada. ' +
      'Falta js/firebase/config.local.js (ver js/firebase/config.example.js). ' +
      'La clínica sigue operando en modo local.'
    );
    return; // No se expone window.firebaseConnector: db.js queda 100% local.
  }

  let dbInstance = null;
  let initPromise = null;

  // Carga una etiqueta script con Subresource Integrity y devuelve una promesa.
  function loadScript(file) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + file.src + '"]')) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = file.src;
      script.integrity = file.integrity;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Error al cargar script: ' + file.src));
      document.head.appendChild(script);
    });
  }

  function initFirebase() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      if (window.firebase) {
        if (!dbInstance) {
          if (window.firebase.apps.length === 0) {
            window.firebase.initializeApp(firebaseConfig);
          }
          dbInstance = window.firebase.firestore();
        }
        return dbInstance;
      }

      try {
        for (const file of SDK_FILES) {
          await loadScript(file);
        }

        if (!window.firebase) {
          throw new Error('El SDK de Firebase no se inicializó correctamente en el objeto window.');
        }

        if (window.firebase.apps.length === 0) {
          window.firebase.initializeApp(firebaseConfig);
        }
        dbInstance = window.firebase.firestore();
        return dbInstance;
      } catch (err) {
        console.error('Falló la conexión con Firestore. El sistema continúa en modo local:', err);
        throw err;
      }
    })();

    return initPromise;
  }

  // Exportar el conector a window para que db.js interactúe con él.
  // db.js construye rutas `clinicas/<clinicaId>/<colección>`, que es el modelo
  // que asumen las reglas de firebase/firestore.rules.
  window.firebaseConnector = {
    init: initFirebase,

    getDocs: async (collectionPath) => {
      try {
        const db = await initFirebase();
        const snapshot = await db.collection(collectionPath).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.error('Error de lectura en Firestore (' + collectionPath + '):', e);
        return [];
      }
    },

    saveDoc: async (collectionPath, docId, data) => {
      try {
        const db = await initFirebase();
        const dataToSave = { ...data, lastSyncAt: new Date().toISOString() };
        await db.collection(collectionPath).doc(docId).set(dataToSave, { merge: true });
        return true;
      } catch (e) {
        console.error('Error al guardar en Firestore (' + collectionPath + '/' + docId + '):', e);
        return false;
      }
    },

    deleteDoc: async (collectionPath, docId) => {
      try {
        const db = await initFirebase();
        await db.collection(collectionPath).doc(docId).delete();
        return true;
      } catch (e) {
        console.error('Error al eliminar en Firestore (' + collectionPath + '/' + docId + '):', e);
        return false;
      }
    }
  };
})();
