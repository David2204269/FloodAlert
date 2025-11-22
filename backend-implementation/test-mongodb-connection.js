/**
 * Script de prueba para verificar la conexión a MongoDB Atlas
 * y el registro de datos
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI no está configurado en el archivo .env');
  process.exit(1);
}

async function testConnection() {
  let client;
  
  try {
    console.log('🔌 Conectando a MongoDB Atlas...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();
    console.log('✅ Conexión exitosa a MongoDB Atlas');

    // Obtener el nombre de la base de datos
    const dbName = MONGODB_URI.split('/').pop()?.split('?')[0] || 'flood_alert';
    const db = client.db(dbName);
    
    // Verificar conexión con ping
    await db.admin().ping();
    console.log(`✅ Base de datos "${dbName}" accesible`);

    // Probar inserción de un documento de prueba
    console.log('\n📝 Probando inserción de datos...');
    const testReading = {
      metadata: {
        sensor_id: 'TEST_SENSOR',
        gateway_id: 'TEST_GATEWAY',
        timestamp: new Date(),
      },
      temperatura_c: 25.5,
      humedad_pct: 65.0,
      caudal_l_s: 2.5,
      lluvia_mm: 10.2,
      nivel_m: 0.45,
      received_at: new Date(),
      processing_timestamp: new Date(),
      test: true, // Marca para identificar documentos de prueba
    };

    const result = await db.collection('sensor_readings').insertOne(testReading);
    console.log(`✅ Documento insertado con ID: ${result.insertedId}`);

    // Verificar que el documento existe
    const insertedDoc = await db.collection('sensor_readings').findOne({
      _id: result.insertedId,
    });

    if (insertedDoc) {
      console.log('✅ Documento verificado en la base de datos');
      console.log(`   Sensor ID: ${insertedDoc.metadata.sensor_id}`);
      console.log(`   Timestamp: ${insertedDoc.received_at}`);
    }

    // Limpiar documento de prueba
    await db.collection('sensor_readings').deleteOne({ _id: result.insertedId });
    console.log('✅ Documento de prueba eliminado');

    // Verificar índices
    console.log('\n📊 Verificando índices...');
    const indexes = await db.collection('sensor_readings').indexes();
    console.log(`✅ ${indexes.length} índice(s) encontrado(s)`);
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n🎉 Todas las pruebas pasaron exitosamente!');
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Asegúrate de que tu IP esté en la whitelist de MongoDB Atlas');
    console.log('   2. Configura API_KEY_SECRET en el archivo .env');
    console.log('   3. Inicia el servidor con: npm run dev');
    console.log('   4. Prueba el endpoint POST /api/v1/data/sensor');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    console.error('\n🔍 Posibles soluciones:');
    console.error('   1. Verifica que MONGODB_URI esté correctamente configurado');
    console.error('   2. Asegúrate de que tu IP esté en la whitelist de MongoDB Atlas');
    console.error('   3. Verifica que las credenciales sean correctas');
    console.error('   4. Revisa que el cluster esté activo en MongoDB Atlas');
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

testConnection();

