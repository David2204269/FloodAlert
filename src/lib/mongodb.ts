/**
 * Módulo de conexión a MongoDB
 * Utiliza el MONGODB_URI de Vercel o conexión directa a MongoDB Atlas
 * Implementa patrón singleton para reutilizar la conexión
 */

import { MongoClient } from "mongodb";

// URI de conexión: preferencia a MONGODB_URI de Vercel, fallback a conexión local
const uri = process.env.MONGODB_URI || "mongodb+srv://FloodAlertDB:Admin123@cluster0.xmb1cvz.mongodb.net/?appName=Cluster0";

if (!uri) {
  throw new Error('MONGODB_URI environment variable not defined');
}
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // En desarrollo, usa una variable global para reutilizar la conexión
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // En producción, crea una nueva conexión
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
