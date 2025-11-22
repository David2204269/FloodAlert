/*
 * TTGO Gateway - Código para enviar datos al Backend
 * 
 * Configuración:
 * 1. Actualiza WIFI_SSID y WIFI_PASSWORD con tus credenciales WiFi
 * 2. Actualiza BACKEND_IP con la IP de tu servidor (o usa localhost si está en la misma red)
 * 3. Actualiza API_KEY con la misma clave que está en tu archivo .env (API_KEY_SECRET)
 * 4. Ajusta SENSOR_ID y GATEWAY_ID según tus dispositivos
 * 
 * Requisitos:
 * - Biblioteca WiFi (incluida en ESP32)
 * - Biblioteca HTTPClient (incluida en ESP32)
 * - Biblioteca ArduinoJson (instalar desde Library Manager)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ============================================
// CONFIGURACIÓN - ACTUALIZA ESTOS VALORES
// ============================================

// WiFi
const char* WIFI_SSID = "TU_SSID_AQUI";
const char* WIFI_PASSWORD = "TU_PASSWORD_AQUI";

// Backend (actualiza con la IP de tu servidor)
// Opción 1: Si el backend está en la misma red local
const char* BACKEND_IP = "192.168.1.7";  // IP de tu servidor (actualizada automáticamente)
const int BACKEND_PORT = 3001;
const char* BACKEND_URL = "http://192.168.1.7:3001/api/v1/data/sensor";  // Actualiza IP si cambia

// Opción 2: Si el backend está en internet (usando ngrok o servicio similar)
// const char* BACKEND_URL = "https://tu-dominio.com/api/v1/data/sensor";

// API Key (debe coincidir con API_KEY_SECRET en tu archivo .env)
const char* API_KEY = "sk_flood_alert_2024_secure_key";  // Actualiza con tu API key

// IDs del dispositivo
const char* SENSOR_ID = "SENSOR_001";
const char* GATEWAY_ID = "GATEWAY_001";

// Intervalo de envío (milisegundos)
const unsigned long SEND_INTERVAL = 60000;  // 60 segundos

// ============================================
// VARIABLES GLOBALES
// ============================================

unsigned long lastSendTime = 0;
unsigned long bootTime = 0;

// ============================================
// SETUP
// ============================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n========================================");
  Serial.println("TTGO Gateway - Flood Alert System");
  Serial.println("========================================\n");
  
  bootTime = millis();
  
  // Conectar a WiFi
  connectToWiFi();
  
  // Configurar NTP para timestamp correcto
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  Serial.println("\n[TTGO] Sistema listo. Enviando datos cada " + String(SEND_INTERVAL/1000) + " segundos");
  Serial.println("[TTGO] Backend URL: " + String(BACKEND_URL));
  Serial.println("[TTGO] Sensor ID: " + String(SENSOR_ID));
  Serial.println("[TTGO] Gateway ID: " + String(GATEWAY_ID));
}

// ============================================
// LOOP PRINCIPAL
// ============================================

void loop() {
  // Verificar conexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[TTGO] WiFi desconectado. Reconectando...");
    connectToWiFi();
    delay(5000);
    return;
  }
  
  // Enviar datos cada SEND_INTERVAL
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    sendSensorData();
    lastSendTime = millis();
  }
  
  delay(1000);  // Pequeño delay para evitar saturar el loop
}

// ============================================
// FUNCIONES
// ============================================

void connectToWiFi() {
  Serial.print("[WiFi] Conectando a: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] ✓ Conectado!");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n[WiFi] ✗ Error: No se pudo conectar");
  }
}

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[TTGO] Error: WiFi no conectado");
    return;
  }
  
  Serial.println("\n[TTGO] Preparando datos para enviar...");
  
  // Leer datos de sensores (REEMPLAZA CON TUS FUNCIONES DE LECTURA REALES)
  float temperatura_c = readTemperature();      // Implementa tu función
  float humedad_pct = readHumidity();          // Implementa tu función
  float caudal_l_s = readFlowRate();           // Implementa tu función
  float lluvia_mm = readRainfall();            // Implementa tu función
  float nivel_m = readWaterLevel();            // Implementa tu función
  
  // Timestamp (segundos desde boot, o mejor usar NTP)
  unsigned long timestamp = getTimestamp();
  
  // Crear JSON payload (formato TTGO)
  StaticJsonDocument<512> doc;
  doc["sensor_id"] = SENSOR_ID;
  doc["gateway_id"] = GATEWAY_ID;
  doc["timestamp"] = timestamp;
  doc["temperatura_c"] = temperatura_c;
  doc["humedad_pct"] = humedad_pct;
  doc["caudal_l_s"] = caudal_l_s;
  doc["lluvia_mm"] = lluvia_mm;
  doc["nivel_m"] = nivel_m;
  doc["seq"] = (millis() - bootTime) / SEND_INTERVAL;  // Número de secuencia
  doc["rssi"] = WiFi.RSSI();  // Señal WiFi
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("[TTGO] Payload JSON:");
  Serial.println(payload);
  
  // Enviar HTTP POST
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  
  // Construir URL completa
  String fullUrl = String(BACKEND_URL);
  http.begin(fullUrl);
  
  // Headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + String(API_KEY));
  http.addHeader("X-Idempotency-Key", String(SENSOR_ID) + "_" + String(timestamp));
  
  Serial.println("[TTGO] Enviando POST a: " + fullUrl);
  
  // Enviar petición
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    Serial.print("[TTGO] Código de respuesta: ");
    Serial.println(httpResponseCode);
    
    String response = http.getString();
    Serial.println("[TTGO] Respuesta del servidor:");
    Serial.println(response);
    
    if (httpResponseCode == 201 || httpResponseCode == 200) {
      Serial.println("[TTGO] ✓ Datos enviados exitosamente!");
      
      // Parsear respuesta para obtener reading_id
      StaticJsonDocument<200> responseDoc;
      DeserializationError error = deserializeJson(responseDoc, response);
      if (!error && responseDoc["ok"]) {
        Serial.print("[TTGO] Reading ID: ");
        Serial.println(responseDoc["reading_id"].as<String>());
      }
    } else {
      Serial.println("[TTGO] ⚠ Respuesta inesperada del servidor");
    }
  } else {
    Serial.print("[TTGO] ✗ Error HTTP: ");
    Serial.println(httpResponseCode);
    Serial.print("[TTGO] Error: ");
    Serial.println(http.errorToString(httpResponseCode));
  }
  
  http.end();
}

// ============================================
// FUNCIONES DE LECTURA DE SENSORES
// ============================================
// REEMPLAZA ESTAS FUNCIONES CON TU CÓDIGO REAL

float readTemperature() {
  // TODO: Implementar lectura de sensor de temperatura
  // Ejemplo: return dht.readTemperature();
  return 25.5;  // Valor de prueba
}

float readHumidity() {
  // TODO: Implementar lectura de sensor de humedad
  // Ejemplo: return dht.readHumidity();
  return 65.0;  // Valor de prueba
}

float readFlowRate() {
  // TODO: Implementar lectura de sensor de caudal
  // Retornar en L/s
  return 2.5;  // Valor de prueba
}

float readRainfall() {
  // TODO: Implementar lectura de pluviómetro
  // Retornar en mm
  return 10.2;  // Valor de prueba
}

float readWaterLevel() {
  // TODO: Implementar lectura de sensor de nivel de agua
  // Retornar en metros
  return 0.45;  // Valor de prueba
}

unsigned long getTimestamp() {
  // Intentar obtener timestamp de NTP
  time_t now = time(nullptr);
  if (now > 0) {
    return (unsigned long)now;
  }
  
  // Fallback: usar millis() convertido a segundos
  return (unsigned long)(millis() / 1000);
}

