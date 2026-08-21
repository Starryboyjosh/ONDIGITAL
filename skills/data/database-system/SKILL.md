---
name: database-system
description: Design Spanish data layers for ONDIGITAL apps, including local prototypes, CRUD, pagination, search, filters, CSV/PDF exports, Firebase/Firestore-style cloud persistence, tenant-aware records, validation, and migration from demo storage to production data boundaries.
---

# ONDIGITAL — Sistemas de Bases de Datos Locales y en la Nube

> Este skill instruye en el diseño e implementación de motores de datos ligeros pero robustos, ideales para aplicaciones que operan localmente (local-first) o conectadas a servicios de nube en tiempo real. Todas las variables y comentarios explicativos se redactan en **español**.

---

## Metadata

- Version: 2.1.0
- Author: ONDIGITAL
- Domain: data/database-system
- Pair with: `skills/security/app-security-review/SKILL.md`, `skills/security/auth-access-control/SKILL.md`, `skills/product/saas-product-ui/SKILL.md`.

## Reglas De Producción Actualizadas

- `localStorage` sirve para prototipos, preferencias y demos sin datos reales; no usarlo como seguridad, base de datos sensible o autorización.
- Validar datos al entrar y al salir de la capa de datos.
- En sistemas multi-tenant, filtrar por tenant en la consulta/regla del backend, no solo en cliente.
- No guardar tokens largos, secretos, contraseñas, datos de pago ni información sensible en storage del navegador.
- Diseñar la API de datos de forma que el backend real pueda reemplazar el mock local sin reescribir toda la UI.

## 📋 Índice
1. [Diseño Relacional Simulado en LocalStorage](#diseño-relacional-simulado-en-localstorage)
2. [Motor de Base de Datos Local Híbrido](#motor-de-base-de-datos-local-híbrido)
3. [Operaciones CRUD con Validación Rigurosa](#operaciones-crud-con-validación-rigurosa)
4. [Búsqueda Autocompletable, Filtros y Paginación](#búsqueda-autocompletable-filtros-y-paginación)
5. [Conexión y Sincronización con Firebase Firestore](#conexión-y-sincronización-con-firebase-firestore)
6. [Actualizaciones y Suscripciones en Tiempo Real](#actualizaciones-y-suscripciones-en-tiempo-real)
7. [Exportación de Datos (CSV e Impresión PDF)](#exportación-de-datos-csv-e-impresión-pdf)
8. [Copias de Seguridad (Backup) y Restauración](#copias-de-seguridad-backup-y-restauración)

---

## Diseño Relacional Simulado en LocalStorage

Para prototipos rápidos y herramientas offline, se puede simular un modelo de datos relacional (uno a muchos, muchos a muchos) indexando y vinculando los registros mediante claves foráneas (`foreign keys`).

### Diagrama de Relaciones Conceptual
```
  [Empresas] (1) <────> (N) [Usuarios]
  [Pacientes] (1) <────> (N) [Citas] (N) <────> (1) [Usuarios (Dentistas)]
  [Pacientes] (1) <────> (N) [Presupuestos]
```

### Inicialización de Datos Clave

```javascript
const DB_SCHEMAS = {
  COMPANIES: 'ondigital_companies',
  USERS: 'ondigital_users',
  PATIENTS: 'ondigital_patients',
  APPOINTMENTS: 'ondigital_appointments'
};

/**
 * Inicializa las tablas base con datos de muestra
 */
function initSampleDatabase() {
  if (!localStorage.getItem(DB_SCHEMAS.COMPANIES)) {
    const companies = [
      { id: 'credental', name: 'Credental', accent: '#004aad' },
      { id: 'credental-central', name: 'Credental Clínica Central', accent: '#cb6ce6' }
    ];
    localStorage.setItem(DB_SCHEMAS.COMPANIES, JSON.stringify(companies));
  }

  if (!localStorage.getItem(DB_SCHEMAS.USERS)) {
    const users = [
      { id: 'usr-1', username: 'admin', name: 'Administrador General', role: 'admin', companyId: 'credental' },
      { id: 'usr-2', username: 'dentista', name: 'Dr. Sebastián Escoto', role: 'dentist', companyId: 'credental' }
    ];
    localStorage.setItem(DB_SCHEMAS.USERS, JSON.stringify(users));
  }
}
```

---

## Motor de Base de Datos Local Híbrido

Una clase centralizada que administra las operaciones en base a colecciones y proporciona persistencia segura aislando errores.

```javascript
class LocalDatabase {
  constructor(schemaKey) {
    this.schemaKey = schemaKey;
  }

  /**
   * Lee todos los registros de la colección
   * @returns {Array}
   */
  read() {
    try {
      const data = localStorage.getItem(this.schemaKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error al leer la colección ${this.schemaKey}:`, e);
      return [];
    }
  }

  /**
   * Guarda la colección completa en LocalStorage
   * @param {Array} data
   */
  write(data) {
    try {
      localStorage.setItem(this.schemaKey, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Error al escribir en la colección ${this.schemaKey}:`, e);
      return false;
    }
  }

  /**
   * Obtiene un registro individual por su identificador único
   * @param {string} id
   * @returns {Object|null}
   */
  findById(id) {
    const records = this.read();
    return records.find(r => r.id === id) || null;
  }
}
```

---

## Operaciones CRUD con Validación Rigurosa

Las inserciones, actualizaciones y borrados deben ejecutarse garantizando la integridad de los datos (evitar duplicados, campos vacíos o tipos erróneos).

```javascript
class ActiveCollection extends LocalDatabase {
  /**
   * Inserta un nuevo registro validando sus propiedades
   * @param {Object} item
   */
  create(item) {
    const records = this.read();
    
    // VALIDACIONES CORE
    if (!item.name || item.name.trim() === '') {
      throw new Error('El campo nombre es obligatorio.');
    }
    
    // Asignar ID único y marcas de tiempo
    const newRecord = {
      id: crypto.randomUUID(),
      ...item,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    records.push(newRecord);
    this.write(records);
    return newRecord;
  }

  /**
   * Actualiza propiedades de un registro existente
   * @param {string} id
   * @param {Object} updates
   */
  update(id, updates) {
    const records = this.read();
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) {
      throw new Error(`Registro con ID ${id} no encontrado.`);
    }

    const updatedRecord = {
      ...records[index],
      ...updates,
      updatedAt: Date.now() // Actualizar marca de tiempo
    };

    records[index] = updatedRecord;
    this.write(records);
    return updatedRecord;
  }

  /**
   * Elimina un registro de la colección
   * @param {string} id
   */
  delete(id) {
    const records = this.read();
    const filtered = records.filter(r => r.id !== id);
    
    if (records.length === filtered.length) {
      throw new Error(`El registro a eliminar no existe.`);
    }
    
    this.write(filtered);
    return true;
  }
}
```

---

## Búsqueda Autocompletable, Filtros y Paginación

Para proveer una UX estelar en listas grandes, es necesario procesar los registros aplicando búsquedas difusas, filtros de categorías y división de páginas.

```javascript
class DataGridProcessor {
  /**
   * Filtra, busca y pagina una colección
   * @param {Array} collection - Registros originales
   * @param {Object} options
   * @param {string} options.query - Texto de búsqueda
   * @param {string} options.filterField - Campo a filtrar
   * @param {any} options.filterValue - Valor de filtrado
   * @param {number} options.page - Página actual (1-indexed)
   * @param {number} options.limit - Registros por página
   */
  static process(collection, { query = '', filterField = '', filterValue = '', page = 1, limit = 10 }) {
    let result = [...collection];

    // 1. Aplicar Búsqueda Predictiva
    if (query.trim() !== '') {
      const search = query.toLowerCase();
      result = result.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(search)
        )
      );
    }

    // 2. Aplicar Filtro de Campo
    if (filterField && filterValue !== '') {
      result = result.filter(item => item[filterField] === filterValue);
    }

    // 3. Paginación
    const totalRecords = result.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = result.slice(startIndex, startIndex + limit);

    return {
      data: paginatedItems,
      pagination: {
        total: totalRecords,
        pages: totalPages,
        currentPage: page,
        perPage: limit
      }
    };
  }
}
```

---

## Conexión y Sincronización con Firebase Firestore

Cuando el negocio escala de prototipos locales a bases de datos reales, se debe mapear la lógica a Firebase Cloud Firestore sin romper la estructura de la interfaz.

```javascript
/**
 * Conector de Firestore (Capa Nube)
 */
const FirestoreService = {
  db: null,

  init(firebaseApp) {
    // Inicializar firestore desde app
    this.db = firebase.firestore();
  },

  async getAll(collectionName, companyId) {
    try {
      const snapshot = await this.db.collection(collectionName)
        .where('companyId', '==', companyId)
        .orderBy('createdAt', 'desc')
        .get();
        
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error(`Error de lectura en Firestore (${collectionName}):`, e);
      throw e;
    }
  },

  async add(collectionName, data) {
    try {
      const docRef = await this.db.collection(collectionName).add({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      console.error(`Error al insertar en Firestore (${collectionName}):`, e);
      throw e;
    }
  }
};
```

---

## Actualizaciones y Suscripciones en Tiempo Real

Para notificaciones o agendas compartidas, se debe escuchar los cambios concurrentes mediante suscripciones reactivas.

```javascript
/**
 * Suscriptor en tiempo real
 */
const RealtimeSync = {
  /**
   * Escucha cambios en una colección de Firestore y ejecuta un callback reactivo
   */
  subscribe(collectionName, companyId, onUpdateCallback) {
    const db = firebase.firestore();
    
    return db.collection(collectionName)
      .where('companyId', '==', companyId)
      .onSnapshot(snapshot => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onUpdateCallback(items);
      }, error => {
        console.error(`Error en suscripción tiempo real (${collectionName}):`, error);
      });
  }
};
```

---

## Exportación de Datos (CSV e Impresión PDF)

Mecanismos de exportación locales rápidos y listos para usar sin depender de backend.

### Exportación a CSV Limpio

```javascript
/**
 * Convierte un arreglo de objetos a CSV y gestiona la descarga
 */
function exportToCSV(filename, collection) {
  if (collection.length === 0) return;
  
  const headers = Object.keys(collection[0]).join(',');
  const rows = collection.map(item => 
    Object.values(item)
      .map(val => `"${String(val).replace(/"/g, '""')}"`)
      .join(',')
  );
  
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

---

## Copias de Seguridad (Backup) y Restauración

Permite a los administradores de la MiPyME resguardar su base de datos local completa descargando un archivo JSON encriptado o legible.

```javascript
const DBBackupManager = {
  /**
   * Genera una descarga JSON con todas las claves de LocalStorage del tenant
   */
  backup(tenantId) {
    const keys = Object.keys(localStorage);
    const backupData = {};
    
    keys.forEach(k => {
      if (k.startsWith(`tenant_${tenantId}_`) || k.startsWith('saas_')) {
        backupData[k] = localStorage.getItem(k);
      }
    });

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `backup_tenant_${tenantId}_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  },

  /**
   * Restaura datos desde un archivo JSON subido por el usuario
   */
  restore(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, String(value));
      });
      return { success: true };
    } catch (e) {
      console.error('Error al restaurar copia de seguridad:', e);
      return { success: false, error: e.message };
    }
  }
};
```
