/* ==========================================================================
   CONFIG.EXAMPLE.JS - PLANTILLA DE CONFIGURACIÓN FIREBASE (OPCIONAL)

   Credental funciona 100% en local (sessionStorage). La sincronización con
   Firestore es opcional y NUNCA se activa sola: hay que copiar este archivo
   a `config.local.js`, rellenarlo con los datos del proyecto de la clínica y
   cargarlo ANTES de `js/db.js` en las páginas que deban sincronizar:

       <script src="js/firebase/config.local.js"></script>
       <script src="js/firebase/connection.js"></script>
       <script src="js/db.js"></script>

   `config.local.js` está ignorado por git a propósito: la configuración de un
   proyecto real no se versiona en este repositorio.

   Las reglas de Firestore del repositorio (`firebase/firestore.rules`) esperan
   el modelo `/clinicas/{clinicaId}/<colección>/{documento}`, que es el que usa
   `js/db.js` al sincronizar.
   ========================================================================== */

window.CREDENTAL_FIREBASE_CONFIG = {
  projectId: '',
  appId: '',
  storageBucket: '',
  apiKey: '',
  authDomain: '',
  messagingSenderId: ''
};
