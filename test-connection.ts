/**
 * Script rápido para probar la conexión a MongoDB
 * Uso: npx ts-node test-connection.ts
 */

import { MongoClient } from "mongodb";

const uri = "mongodb+srv://FloodAlertDB:Admin123@cluster0.xmb1cvz.mongodb.net/?appName=Cluster0";

async function testConnection() {
  const client = new MongoClient(uri);

  try {
    console.log("🔌 Conectando a MongoDB...");
    await client.connect();

    console.log("✅ Conexión exitosa!");

    // Obtener información del servidor
    const admin = client.db("admin");
    const status = await admin.command({ ping: 1 });
    console.log("🏓 Ping:", status);

    // Listar bases de datos
    const result = await admin.command({ listDatabases: 1 }) as any;
    console.log("\n📚 Bases de datos disponibles:");
    result.databases.forEach((db: any) => {
      console.log(`  - ${db.name}`);
    });

    // Conectar a la DB flood_alert
    const floodDb = client.db("flood_alert");
    const collections = await floodDb.listCollections().toArray();
    console.log("\n📋 Colecciones en 'flood_alert':");
    if (collections.length === 0) {
      console.log("  (vacía - se crearán al insertar datos)");
    } else {
      collections.forEach((col) => {
        console.log(`  - ${col.name}`);
      });
    }

    console.log("\n✅ ¡Todas las pruebas pasaron!");
  } catch (error) {
    console.error("❌ Error de conexión:", error);
  } finally {
    await client.close();
    console.log("🔓 Conexión cerrada");
  }
}

testConnection();
