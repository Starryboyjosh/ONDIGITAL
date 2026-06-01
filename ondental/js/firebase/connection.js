/* ==========================================================================
   CONNECTION.JS - CONECTOR MODULAR Y EFICIENTE A GOOGLE FIREBASE
   Gestiona la carga dinámica del SDK y la sincronización con Firestore.
   ========================================================================== */

(function() {
  const firebaseConfig = {
    projectId: "ondigital-d39aa",
    appId: "1:400540079066:web:d29d17099814753bc226e3",
    storageBucket: "ondigital-d39aa.firebasestorage.app",
    apiKey: "AIzaSyBxVmPi2iVEt1BnEE6kmlDlzF0No_u8xXs",
    authDomain: "ondigital-d39aa.firebaseapp.com",
    messagingSenderId: "400540079066",
    projectNumber: "400540079066"
  };

  let dbInstance = null;
  let initPromise = null;

  // Carga dinámicamente una etiqueta script y devuelve una promesa
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Si ya existe un script con esta fuente, no lo duplicamos
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Error al cargar script: ${src}`));
      document.head.appendChild(script);
    });
  }

  // Inicializa Firebase y Firestore cargando las dependencias desde CDN si es necesario
  function initFirebase() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      // Si ya está definido a nivel global (por ejemplo, cargado por otra vía)
      if (window.firebase) {
        if (!dbInstance) {
          if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
          }
          dbInstance = firebase.firestore();
        }
        return dbInstance;
      }

      // Cargar dependencias de Firebase Compat de forma asíncrona
      try {
        await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js');

        if (!window.firebase) {
          throw new Error("El SDK de Firebase no se inicializó correctamente en el objeto window.");
        }

        if (firebase.apps.length === 0) {
          firebase.initializeApp(firebaseConfig);
        }
        dbInstance = firebase.firestore();
        console.log("🔥 Conectado con éxito a Firebase Firestore en OnDigital");
        return dbInstance;
      } catch (err) {
        console.error("⚠️ Falló la conexión con Firebase. El sistema continuará en modo local offline:", err);
        throw err;
      }
    })();

    return initPromise;
  }

  // Exportar el conector a window para que db.js interactúe con él
  window.firebaseConnector = {
    init: initFirebase,
    
    // Obtiene todos los documentos de una colección
    getDocs: async (collectionName) => {
      try {
        const db = await initFirebase();
        const snapshot = await db.collection(collectionName).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.error(`Error de lectura en Firestore (${collectionName}):`, e);
        return [];
      }
    },

    // Guarda o actualiza un documento con un ID específico
    saveDoc: async (collectionName, docId, data) => {
      try {
        const db = await initFirebase();
        // Evitamos marcas de tiempo circulares o complejas si no es necesario,
        // pero incluimos campos de control en formato ISO/texto para facilidad de lectura
        const dataToSave = {
          ...data,
          lastSyncAt: new Date().toISOString()
        };
        await db.collection(collectionName).doc(docId).set(dataToSave, { merge: true });
        return true;
      } catch (e) {
        console.error(`Error al guardar en Firestore (${collectionName}/${docId}):`, e);
        return false;
      }
    },

    // Elimina un documento
    deleteDoc: async (collectionName, docId) => {
      try {
        const db = await initFirebase();
        await db.collection(collectionName).doc(docId).delete();
        return true;
      } catch (e) {
        console.error(`Error al eliminar en Firestore (${collectionName}/${docId}):`, e);
        return false;
      }
    }
  };

  // Intentamos pre-cargar la conexión de Firebase al cargar este archivo
  initFirebase().catch(() => {});
})();
