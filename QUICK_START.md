# ⚡ QUICK START - API REST Sensores

## 🚀 En 3 pasos

### 1️⃣ Instalar & Ejecutar
```bash
npm install
npm run dev
```

### 2️⃣ Probar API
```bash
# Terminal 2: POST crear lectura
curl -X POST http://localhost:3000/api/sensores \
  -H "Content-Type: application/json" \
  -d '{
    "lluvia_ao":25.5,
    "humedad_ao":65,
    "nivel_flotador":"medio",
    "flujo_lmin":12.3,
    "temperatura_c":28.5,
    "timestamp":'$(date +%s000)'
  }'

# GET obtener todas
curl http://localhost:3000/api/sensores
```

### 3️⃣ Ver datos en MongoDB
Ve a [MongoDB Compass](https://www.mongodb.com/products/compass)
```
URI: mongodb+srv://FloodAlertDB:Admin123@cluster0.xmb1cvz.mongodb.net/?appName=Cluster0
DB: flood_alert
Collection: lecturas
```

---

## 📝 Ejemplos desde TTGO

### Arduino/C++
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

HTTPClient http;
String url = "https://<tu-app>.vercel.app/api/sensores";

StaticJsonDocument<512> doc;
doc["lluvia_ao"] = 25.5;
doc["humedad_ao"] = 65.0;
doc["nivel_flotador"] = "medio";
doc["flujo_lmin"] = 12.3;
doc["temperatura_c"] = 28.5;
doc["timestamp"] = millis();

String json;
serializeJson(doc, json);

http.begin(url);
http.addHeader("Content-Type", "application/json");
int code = http.POST(json);
String response = http.getString();
http.end();

Serial.println(response);
```

### Python
```python
import requests
import time

url = "http://localhost:3000/api/sensores"  # o tu URL de Vercel

data = {
    "lluvia_ao": 25.5,
    "humedad_ao": 65.0,
    "nivel_flotador": "medio",
    "flujo_lmin": 12.3,
    "temperatura_c": 28.5,
    "timestamp": int(time.time() * 1000)
}

response = requests.post(url, json=data)
print(response.json())
```

### JavaScript/Node
```js
const data = {
  lluvia_ao: 25.5,
  humedad_ao: 65.0,
  nivel_flotador: "medio",
  flujo_lmin: 12.3,
  temperatura_c: 28.5,
  timestamp: Date.now()
};

fetch('http://localhost:3000/api/sensores', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
.then(r => r.json())
.then(console.log);
```

---

## 📡 6 Endpoints Listos

| Acción | Método | Ruta |
|--------|--------|------|
| Crear | POST | `/api/sensores` |
| Listar todas | GET | `/api/sensores` |
| Obtener por ID | GET | `/api/sensores/:id` |
| Actualizar | PATCH | `/api/sensores/:id` |
| Borrar una | DELETE | `/api/sensores/:id` |
| Borrar todas | DELETE | `/api/sensores` |

---

## ✅ Checklist

- [x] Conexión MongoDB Atlas
- [x] 6 Endpoints CRUD
- [x] Validación de datos
- [x] TypeScript estricto
- [x] Documentación completa
- [x] Listo para Vercel

---

**¡Listo para producción! 🎉**

Ver más en: `RESUMEN_FINAL_API.md`
