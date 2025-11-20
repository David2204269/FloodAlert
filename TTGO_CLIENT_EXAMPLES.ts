/**
 * Ejemplo de código para TTGO (Arduino/MicroPython)
 * Envía datos de sensores a la API REST
 * 
 * Este archivo muestra cómo integrar tu dispositivo TTGO con la API de sensores
 */

// ==================== EJEMPLO EN ARDUINO (C++) ====================

/*
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
const char* serverName = "https://<tu-app>.vercel.app/api/sensores";

// Pines de entrada analógica
const int PIN_LLUVIA = 34;        // ADC1_CH6
const int PIN_HUMEDAD = 35;       // ADC1_CH7
const int PIN_FLUJO = 32;         // ADC1_CH4
const int PIN_TEMPERATURA = 33;   // ADC1_CH5

// Pines digitales
const int PIN_FLOTADOR = 25;      // GPIO25

void setup() {
  Serial.begin(115200);
  
  // Conectar a WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi Conectado");
  
  pinMode(PIN_FLOTADOR, INPUT);
}

void loop() {
  // Leer sensores
  float lluvia = leerLluvia();
  float humedad = leerHumedad();
  String nivel = leerFlotador();
  float flujo = leerFlujo();
  float temperatura = leerTemperatura();
  long timestamp = millis();
  
  // Enviar a API
  enviarDatos(lluvia, humedad, nivel, flujo, temperatura, timestamp);
  
  // Esperar 10 segundos antes de siguiente lectura
  delay(10000);
}

float leerLluvia() {
  int raw = analogRead(PIN_LLUVIA);
  return map(raw, 0, 4095, 0, 100); // 0-100%
}

float leerHumedad() {
  int raw = analogRead(PIN_HUMEDAD);
  return map(raw, 0, 4095, 0, 100); // 0-100%
}

String leerFlotador() {
  int nivel = digitalRead(PIN_FLOTADOR);
  if (nivel == HIGH) return "alto";
  else return "bajo";
}

float leerFlujo() {
  int raw = analogRead(PIN_FLUJO);
  return map(raw, 0, 4095, 0, 100); // 0-100 L/min
}

float leerTemperatura() {
  int raw = analogRead(PIN_TEMPERATURA);
  // Ajusta según tu sensor (ej: DS18B20, DHT22, etc)
  return map(raw, 0, 4095, -10, 50); // -10 a 50°C
}

void enviarDatos(float lluvia, float humedad, String nivel, 
                 float flujo, float temperatura, long timestamp) {
  
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Crear JSON
    StaticJsonDocument<512> doc;
    doc["lluvia_ao"] = lluvia;
    doc["humedad_ao"] = humedad;
    doc["nivel_flotador"] = nivel;
    doc["flujo_lmin"] = flujo;
    doc["temperatura_c"] = temperatura;
    doc["timestamp"] = timestamp;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Enviar POST
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.POST(jsonString);
    
    if (httpCode == 201) {
      Serial.println("Datos enviados correctamente");
      String response = http.getString();
      Serial.println(response);
    } else {
      Serial.print("Error: ");
      Serial.println(httpCode);
    }
    
    http.end();
  }
}
*/

// ==================== EJEMPLO EN MicroPython ====================

/*
import urequests
import json
import machine
from time import sleep

SSID = "TU_WIFI_SSID"
PASSWORD = "TU_WIFI_PASSWORD"
API_URL = "https://<tu-app>.vercel.app/api/sensores"

# ADC pins
adc_lluvia = machine.ADC(machine.Pin(34))
adc_humedad = machine.ADC(machine.Pin(35))
adc_flujo = machine.ADC(machine.Pin(32))
adc_temperatura = machine.ADC(machine.Pin(33))

# Digital pins
pin_flotador = machine.Pin(25, machine.Pin.IN)

def conectar_wifi():
    import network
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(SSID, PASSWORD)
    while not wlan.isconnected():
        print('Conectando WiFi...')
        sleep(1)
    print('WiFi conectado')

def leer_sensores():
    lluvia = (adc_lluvia.read() / 4095) * 100
    humedad = (adc_humedad.read() / 4095) * 100
    flujo = (adc_flujo.read() / 4095) * 100
    temperatura = ((adc_temperatura.read() / 4095) * 60) - 10
    nivel = "alto" if pin_flotador.value() == 1 else "bajo"
    timestamp = int(time.time() * 1000)  # milliseconds
    
    return {
        "lluvia_ao": lluvia,
        "humedad_ao": humedad,
        "nivel_flotador": nivel,
        "flujo_lmin": flujo,
        "temperatura_c": temperatura,
        "timestamp": timestamp
    }

def enviar_datos(datos):
    headers = {"Content-Type": "application/json"}
    try:
        response = urequests.post(API_URL, 
                                json=datos, 
                                headers=headers,
                                timeout=5)
        print(f"Status: {response.status_code}")
        print(response.json())
        response.close()
    except Exception as e:
        print(f"Error: {e}")

def main():
    conectar_wifi()
    
    while True:
        datos = leer_sensores()
        print(f"Datos: {datos}")
        enviar_datos(datos)
        sleep(10)  # Esperar 10 segundos

if __name__ == "__main__":
    main()
*/

// ==================== EJEMPLO EN JavaScript/Node.js ====================

/*
const axios = require('axios');

const API_URL = 'https://<tu-app>.vercel.app/api/sensores';

// Simular lectura de sensores
function leerSensores() {
  return {
    lluvia_ao: 25.5,
    humedad_ao: 65.0,
    nivel_flotador: 'medio',
    flujo_lmin: 12.3,
    temperatura_c: 28.5,
    timestamp: Date.now()
  };
}

// Enviar datos a la API
async function enviarDatos() {
  try {
    const datos = leerSensores();
    
    const response = await axios.post(API_URL, datos, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Respuesta:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Ejecutar cada 10 segundos
setInterval(enviarDatos, 10000);
*/

// ==================== EJEMPLO EN PYTHON ====================

/*
import requests
import json
import time
from datetime import datetime

API_URL = 'https://<tu-app>.vercel.app/api/sensores'

def leer_sensores():
    """Simula lectura de sensores"""
    return {
        'lluvia_ao': 25.5,
        'humedad_ao': 65.0,
        'nivel_flotador': 'medio',
        'flujo_lmin': 12.3,
        'temperatura_c': 28.5,
        'timestamp': int(time.time() * 1000)
    }

def enviar_datos():
    """Envía datos a la API REST"""
    try:
        datos = leer_sensores()
        
        response = requests.post(
            API_URL,
            json=datos,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        print(f'Status: {response.status_code}')
        print(f'Response: {response.json()}')
        return response.json()
        
    except requests.exceptions.RequestException as e:
        print(f'Error: {e}')

def main():
    print(f'[{datetime.now()}] Iniciando envío de datos...')
    
    while True:
        enviar_datos()
        time.sleep(10)  # Esperar 10 segundos

if __name__ == '__main__':
    main()
*/

export {}; // TypeScript placeholder
