/**
 * Script de testing para la API REST de Sensores
 * Prueba todos los endpoints CRUD
 * 
 * Uso:
 * npx ts-node test-api.ts
 * o
 * node test-api.js
 */

interface SensorData {
  lluvia_ao: number;
  humedad_ao: number;
  nivel_flotador: string;
  flujo_lmin: number;
  temperatura_c: number;
  timestamp: number;
}

// Reemplaza con tu URL de Vercel
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_ENDPOINT = `${API_BASE_URL}/api/sensores`;

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color: string, title: string, message: any) {
  console.log(`\n${color}[${title}]${colors.reset}`, JSON.stringify(message, null, 2));
}

async function testAPI() {
  let lecturaId: string | null = null;

  try {
    // 1. POST - Crear lectura
    console.log(`\n${colors.blue}=== TEST 1: POST /api/sensores ===${colors.reset}`);
    const sensorData: SensorData = {
      lluvia_ao: 25.5,
      humedad_ao: 65.0,
      nivel_flotador: 'medio',
      flujo_lmin: 12.3,
      temperatura_c: 28.5,
      timestamp: Date.now(),
    };

    const postResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sensorData),
    });

    const postData = await postResponse.json();
    log(colors.green, `POST ${postResponse.status}`, postData);

    if (postData.ok && postData.data._id) {
      lecturaId = postData.data._id;
      console.log(`${colors.green}✓ Lectura creada con ID: ${lecturaId}${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Error al crear lectura${colors.reset}`);
    }

    // 2. GET - Obtener todas las lecturas
    console.log(`\n${colors.blue}=== TEST 2: GET /api/sensores ===${colors.reset}`);
    const getResponse = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const getAllData = await getResponse.json();
    console.log(`${colors.green}✓ Total de lecturas: ${getAllData.data.length}${colors.reset}`);
    log(colors.green, `GET ${getResponse.status}`, {
      ok: getAllData.ok,
      count: getAllData.data.length,
      sample: getAllData.data[0],
    });

    // 3. GET by ID - Obtener lectura específica
    if (lecturaId) {
      console.log(`\n${colors.blue}=== TEST 3: GET /api/sensores/${lecturaId} ===${colors.reset}`);
      const getByIdResponse = await fetch(`${API_ENDPOINT}/${lecturaId}`, {
        method: 'GET',
      });

      const getByIdData = await getByIdResponse.json();
      log(colors.green, `GET ${getByIdResponse.status}`, getByIdData);
    }

    // 4. PATCH - Actualizar lectura
    if (lecturaId) {
      console.log(`\n${colors.blue}=== TEST 4: PATCH /api/sensores/${lecturaId} ===${colors.reset}`);
      const updateData = {
        temperatura_c: 32.0,
        nivel_flotador: 'alto',
      };

      const patchResponse = await fetch(`${API_ENDPOINT}/${lecturaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const patchData = await patchResponse.json();
      log(colors.green, `PATCH ${patchResponse.status}`, patchData);
    }

    // 5. POST - Crear segunda lectura para test de DELETE colección
    console.log(`\n${colors.blue}=== TEST 5: POST /api/sensores (segunda lectura) ===${colors.reset}`);
    const sensorData2: SensorData = {
      lluvia_ao: 30.0,
      humedad_ao: 70.0,
      nivel_flotador: 'alto',
      flujo_lmin: 15.5,
      temperatura_c: 30.0,
      timestamp: Date.now(),
    };

    const post2Response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sensorData2),
    });

    const post2Data = await post2Response.json();
    console.log(`${colors.green}✓ Segunda lectura creada${colors.reset}`);

    // 6. DELETE by ID - Eliminar lectura específica
    if (lecturaId) {
      console.log(`\n${colors.blue}=== TEST 6: DELETE /api/sensores/${lecturaId} ===${colors.reset}`);
      const deleteResponse = await fetch(`${API_ENDPOINT}/${lecturaId}`, {
        method: 'DELETE',
      });

      const deleteData = await deleteResponse.json();
      log(colors.green, `DELETE ${deleteResponse.status}`, deleteData);
    }

    // 7. Error test - GET lectura inexistente
    console.log(`\n${colors.blue}=== TEST 7: GET /api/sensores/INVALID_ID (error) ===${colors.reset}`);
    const errorResponse = await fetch(`${API_ENDPOINT}/INVALID_ID`, {
      method: 'GET',
    });

    const errorData = await errorResponse.json();
    log(colors.yellow, `GET ${errorResponse.status} (expected error)`, errorData);

    // 8. Validación test - POST sin campos requeridos
    console.log(`\n${colors.blue}=== TEST 8: POST sin validación (error) ===${colors.reset}`);
    const invalidData = {
      lluvia_ao: 'invalid', // Debería ser number
      humedad_ao: 65.0,
    };

    const validationResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData),
    });

    const validationData = await validationResponse.json();
    log(colors.yellow, `POST ${validationResponse.status} (validation error)`, validationData);

    // 9. GET - Verificar estado final
    console.log(`\n${colors.blue}=== TEST 9: GET /api/sensores (final count) ===${colors.reset}`);
    const finalResponse = await fetch(API_ENDPOINT, {
      method: 'GET',
    });

    const finalData = await finalResponse.json();
    console.log(`${colors.green}✓ Total final de lecturas: ${finalData.data.length}${colors.reset}`);

    console.log(`\n${colors.green}=== TESTS COMPLETADOS ===${colors.reset}\n`);
  } catch (error) {
    log(colors.red, 'ERROR', error);
  }
}

// Ejecutar tests
testAPI().catch(console.error);
