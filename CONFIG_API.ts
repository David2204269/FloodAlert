// CONFIGURACIÓN MONGODB ACTUALIZADA
// Archivo: src/lib/mongodb.ts

const MONGODB_CONFIG = {
  // Conexión Atlas
  connectionString: "mongodb+srv://FloodAlertDB:Admin123@cluster0.xmb1cvz.mongodb.net/?appName=Cluster0",
  
  // Base de datos
  database: "flood_alert",
  
  // Colección
  collection: "lecturas",
  
  // Pool de conexiones
  poolSize: {
    min: 5,
    max: 10
  },
  
  // Timeout
  timeout: 30000
};

// ESTRUCTURA DE DOCUMENTO EN LA COLECCIÓN 'lecturas'
interface SensorReading {
  _id?: string;                    // ObjectId de MongoDB
  lluvia_ao: number;              // Nivel de lluvia
  humedad_ao: number;             // Humedad relativa
  nivel_flotador: string;         // alto | medio | bajo
  flujo_lmin: number;             // Flujo en litros/minuto
  temperatura_c: number;          // Temperatura
  timestamp: number;              // Timestamp TTGO (ms)
  createdAt?: Date;               // Fecha de creación en backend
}

// ENDPOINTS IMPLEMENTADOS

const ENDPOINTS = {
  // Crear lectura
  createReading: {
    method: "POST",
    route: "/api/sensores",
    body: {
      lluvia_ao: 25.5,
      humedad_ao: 65.0,
      nivel_flotador: "medio",
      flujo_lmin: 12.3,
      temperatura_c: 28.5,
      timestamp: Date.now()
    },
    response: {
      ok: true,
      data: {
        _id: "...",
        lluvia_ao: 25.5,
        humedad_ao: 65.0,
        nivel_flotador: "medio",
        flujo_lmin: 12.3,
        temperatura_c: 28.5,
        timestamp: Date.now(),
        createdAt: new Date()
      }
    }
  },
  
  // Obtener todas
  getAllReadings: {
    method: "GET",
    route: "/api/sensores",
    response: {
      ok: true,
      data: [
        {
          _id: "...",
          lluvia_ao: 25.5,
          // ... más campos
        }
      ]
    }
  },
  
  // Obtener por ID
  getReadingById: {
    method: "GET",
    route: "/api/sensores/:id",
    response: {
      ok: true,
      data: { /* documento */ }
    }
  },
  
  // Actualizar
  updateReading: {
    method: "PATCH",
    route: "/api/sensores/:id",
    body: {
      temperatura_c: 32.0,
      nivel_flotador: "alto"
    },
    response: {
      ok: true,
      data: { /* documento actualizado */ }
    }
  },
  
  // Eliminar por ID
  deleteReading: {
    method: "DELETE",
    route: "/api/sensores/:id",
    response: {
      ok: true,
      data: { deletedCount: 1 }
    }
  },
  
  // Eliminar todos
  deleteAllReadings: {
    method: "DELETE",
    route: "/api/sensores",
    response: {
      ok: true,
      data: { deletedCount: 45 }
    }
  }
};

// VALIDACIÓN DE DATOS
const VALIDATION_RULES = {
  lluvia_ao: "number",
  humedad_ao: "number",
  nivel_flotador: "string",
  flujo_lmin: "number",
  temperatura_c: "number",
  timestamp: "number"
};

// CÓDIGOS HTTP
const HTTP_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

export { MONGODB_CONFIG, ENDPOINTS, VALIDATION_RULES, HTTP_CODES };
