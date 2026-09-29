# Notas de trabajo

Pendientes de decisión y referencia completa de la API.
Fecha de la última verificación: 2026-09-29 (`npm run build` en verde, endpoints probados contra la BD real).

---

## 1. Decisiones pendientes

### 1.1 El precio de los dulces lo manda el cliente

**Situación.** `POST /delys/pedido` no recibe solo el identificador del dulce: recibe el dulce entero (`id`, `nombre`, `precio`) y `DelysService.upsertDulce()` lo escribe tal cual en la tabla `dulce` (`src/delys/delys.service.ts:101`).

**Qué pasa hoy.** Un usuario autenticado puede mandar `precio: 1` para un dulce que en el catálogo vale 1000, y como el total se calcula con lo que quedó guardado (`precio_total += dulces[i].precio * cantidad`), el pedido sale por 1. También puede renombrar un dulce o inventarse uno nuevo con el id que quiera. El precio oficial de la pastelería deja de estar en el servidor.

**No es un descuido de la cuota ni de las imágenes**, pero las dos cosas que sí construimos (cuota por proyecto e imágenes) asumen que el catálogo lo controla el servidor, así que dejarlo abierto es incoherente.

**Opción A — la recomendada.** Que el DTO pida solo el id y el precio salga siempre de la BD:

```json
{ "encargos": [ { "dulce": 1, "cantidad": 2 } ] }
```

`crearPedido()` carga los dulces con `findBy({ id: In(ids) })`, calcula el total con esos precios y responde `404` (o `400` con el detalle) si algún id no existe. La ventaja es que el cliente no puede mentir y el payload se parece al carrito que ve el usuario. Lo que cuesta: cambiar `CreateDulceDto`/`CreateEncargoDto`, borrar `upsertDulce()` y ajustar el cliente Tauri.

**Opción B — la que hay.** Dejar el DTO como está y solo validar en el servicio que el `precio` y el `nombre` que llegan coincidan con los del catálogo, rechazando el pedido si no. Se arregla el agujero sin cambiar la API, pero sigue siendo raro que un endpoint de pedido sirva para escribir el catálogo.

**Opción C — no hacer nada ahora.** Aceptar el riesgo mientras la pastelería sea la única usuaria. No recomendado: en cuanto haya dos personas usando la app, cualquiera puede rebajar precios.

---

### 1.2 Las rutas de pedidos cambiaron de nombre

**Situación.** Antes eran `GET /delys/:id` y `DELETE /delys/:id`; ahora son `GET /delys/pedidos/:id` y `DELETE /delys/pedidos/:id`.

**Por qué.** Con las rutas de imágenes, `GET /delys/dulces` (público) y `GET /delys/dulces/:id/imagen` convivían con un comodín `GET /delys/:id`. Hoy funciona porque Nest registra en orden, pero es frágil: el día que se agregue `GET /delys/ofertas/...` el comodín se puede comer la ruta. Con `pedidos/` delante el emparejamiento es exacto y no hay ambigüedad.

**Qué implica.** Si el cliente Tauri ya está consuming `/delys/:id`, hay que cambiarlo por `/delys/pedidos/:id`. Si el cliente todavía no existe, no hay nada que hacer y nos quedamos con el nombre explícito.

**Decisión.** ¿Se deja como está o se vuelve a `/delys/:id`?

---

### 1.3 Cosas que también hay que hacer antes de producción

No son decisiones, solo recordatorios que quedaron sueltos:

* Falta la `SUPABASE_SERVICE_ROLE_KEY` real en `.env` (ahora está el marcador) y hay que crear los buckets `delys` y `domus` públicos de lectura en el panel de Supabase. Hasta eso, la subida real no se pudo probar: el `503` que devolvía era el guard de credenciales, no un fallo de la lógica.
* No hay límite de intentos de login (`@nestjs/throttler`) ni log de auditoría.
* La tabla `storage_quota` se crea sola con `synchronize: true`. Cuando eso se desactive hay que generar la migración de `usuario`, `storage_quota` y la columna `dulce.imagen_bytes` / `dulce.imagen_url`.
* En la base de datos de pruebas quedó una tabla `test` suelta de una sesión anterior; se puede borrar.

---

## 2. API

Base: `http://127.0.0.1:3000`

Dos guards globales (`src/auth/auth.module.ts`): primero `JwtAuthGuard` (firma del token + que el usuario siga activo en la BD) y después `RolesGuard` (`@Roles('delys')`). **Si una ruta no está marcada con `@Public()`, nace protegida.** El `rol` viaja dentro del token; el cliente nunca lo elige.

### 2.1 Resumen

| Método | Ruta | Acceso |
| --- | --- | --- |
| `GET` | `/ping` | público |
| `GET` | `/delys/dulces` | público |
| `GET` | `/delys/ofertas` | público |
| `POST` | `/auth/login` | público |
| `POST` | `/auth/registro` | público, **solo** mientras el rol no tenga usuarios |
| `POST` | `/auth/usuarios` | cualquier rol, crea usuarios **de ese mismo rol** |
| `POST` | `/auth/cambiar-password` | cualquier rol, solo la propia contraseña |
| `GET` | `/auth/yo` | cualquier rol |
| `GET` | `/storage/quota` | cualquier rol, devuelve la cuota de su proyecto |
| `POST` | `/delys/pedido` | `delys` |
| `GET` | `/delys/pedidos` | `delys` |
| `GET` | `/delys/pedidos/:id` | `delys` |
| `DELETE` | `/delys/pedidos/:id` | `delys` |
| `POST` | `/delys/dulces/:id/imagen` | `delys` |
| `DELETE` | `/delys/dulces/:id/imagen` | `delys` |

Formato de errores, siempre el mismo:

```json
{ "message": "No existe el dulce 99", "error": "Bad Request", "statusCode": 400 }
```

Códigos usados: `400` datos inválidos o cuota insuficiente, `401` sin token / token caducado / contraseña incorrecta, `403` rol que no es el del proyecto, `404` recurso inexistente, `409` `usuario` repetido, `503` falta la configuración de Supabase.

---

### 2.2 `GET /ping`

Health check. Sin parámetros, sin token.

```bash
curl localhost:3000/ping
# -> { "ok": true }
```

---

### 2.3 `POST /auth/login`

Devuelve el token que usan todas las rutas protegidas. Sin parámetros de ruta.

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `usuario` | string | obligatorio, máx. 60. Se compara en minúsculas |
| `password` | string | obligatorio, máx. 200 |

```bash
curl -X POST localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"usuario":"propietaria","password":"una-clave-larga"}'
```

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 28800
}
```

`expires_in` sale de `AUTH_JWT_EXPIRES_IN` (28800 = 8 h). El mismo 401 sale si el usuario no existe y si la contraseña está mal, para no revelar qué cuentas hay.

---

### 2.4 `POST /auth/registro`

Alta del **primer** usuario de un proyecto. Sin token mientras el rol esté vacío; en cuanto el rol tiene un usuario, esta ruta se cierra (401) y hay que usar `/auth/usuarios`.

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | string | obligatorio, máx. 120 |
| `usuario` | string | obligatorio, máx. 60, único |
| `password` | string | obligatorio, entre 8 y 200 caracteres |
| `rol` | string | opcional, `delys` o `domus`. Si se omite, `delys` |

```bash
# Primer arranque del proyecto delys: la tabla usuario está vacía.
curl -X POST localhost:3000/auth/registro \
  -H 'content-type: application/json' \
  -d '{"nombre":"Propietaria","usuario":"propietaria","password":"una-clave-larga","rol":"delys"}'
```

```json
{
  "mensaje": "Usuario creado correctamente",
  "usuario": {
    "id": "8afce1d2-2027-46ec-9d7b-6d52cb03fab5",
    "nombre": "Propietaria",
    "usuario": "propietaria",
    "rol": "delys"
  }
}
```

La respuesta nunca incluye el hash. Para crear un proyecto nuevo se repite con `rol` distinto; el registro público sigue abierto porque ese rol no tiene usuarios.

---

### 2.5 `POST /auth/usuarios`

Alta de más gente **dentro del proyecto de quien llama**. Requiere `Authorization: Bearer <token>`.

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | string | obligatorio, máx. 120 |
| `usuario` | string | obligatorio, máx. 60, único |
| `password` | string | obligatorio, entre 8 y 200 caracteres |
| `rol` | — | **se ignora.** El rol sale del token; mandar otro no cambia nada |

```bash
curl -X POST localhost:3000/auth/usuarios \
  -H "Authorization: Bearer eyJ..." \
  -H 'content-type: application/json' \
  -d '{"nombre":"Familiar","usuario":"familiar","password":"otra-clave-larga"}'
```

Mismo cuerpo de respuesta que `/auth/registro`. Un token de `delys` no puede crear usuarios de `domus`: si se manda `"rol":"domus"`, el usuario sale con `rol: "delys"`. Un `usuario` repetido da `409`.

---

### 2.6 `POST /auth/cambiar-password`

Cambia la contraseña del que llama. Requiere token.

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `password_actual` | string | obligatorio, la que está en la BD |
| `password_nueva` | string | obligatorio, entre 8 y 200 caracteres |

```bash
curl -X POST localhost:3000/auth/cambiar-password \
  -H "Authorization: Bearer eyJ..." \
  -H 'content-type: application/json' \
  -d '{"password_actual":"una-clave-larga","password_nueva":"una-clave-mas-larga"}'
```

```json
{ "mensaje": "Contraseña actualizada correctamente" }
```

Si `password_actual` no coincide da `401` y no cambia nada. El token sigue siendo válido: hay que iniciar sesión otra vez para comprobar la nueva.

---

### 2.7 `GET /auth/yo`

Devuelve lo que el token afirma ser el usuario. Sin parámetros.

```bash
curl localhost:3000/auth/yo -H "Authorization: Bearer eyJ..."
```

```json
{ "sub": "8afce1d2-...", "usuario": "propietaria", "rol": "delys", "iat": 1790692239 }
```

---

### 2.8 `GET /storage/quota`

Estado de la cuota **del proyecto del token** (no del usuario: los usuarios de `delys` comparten la misma). Sin parámetros.

```bash
curl localhost:3000/storage/quota -H "Authorization: Bearer eyJ..."
```

```json
{
  "rol": "delys",
  "bytes_usados": 5242880,
  "limite_bytes": 20971520,
  "bytes_disponibles": 15728640
}
```

Cambiar el límite o dar de alta un proyecto es SQL directo:

```sql
UPDATE storage_quota SET limite_bytes = 52428800 WHERE rol = 'delys';
INSERT INTO storage_quota (rol, bytes_usados, limite_bytes) VALUES ('delys-domicilio', 0, 20971520);
```

---

### 2.9 `GET /delys/dulces`

Catálogo. Sin token, pensado para que la vitrina se vea sin iniciar sesión.

```bash
curl localhost:3000/delys/dulces
```

```json
{
  "dulces": [
    { "id": 1, "nombre": "Charolas surtida", "precio": 1000, "imagen_url": null, "imagen_bytes": null }
  ]
}
```

`imagen_url` es `null` hasta que se suba una imagen por `/delys/dulces/:id/imagen`; `imagen_bytes` es el tamaño del archivo y existe para poder devolver los bytes a la cuota al borrar.

---

### 2.10 `GET /delys/ofertas`

Texto de las ofertas (sin imágenes). Sin token.

```bash
curl localhost:3000/delys/ofertas
# -> { "ofertas": [ { "id": 1, "nombre": "Charolas surtida", "precio": 1000, "imagen_url": null } ] }
```

---

### 2.11 `POST /delys/pedido`

Crea un pedido. Requiere token con rol `delys`.

**Ojo con la forma del `dulce`:** el DTO actual (`src/delys/dto/create-pedido.dto.ts`) pide el dulce completo, no solo el id. Es justo lo que se decide en el punto 1.1.

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `encargos` | array | obligatorio, mínimo 1 elemento |
| `encargos[].dulce` | object | obligatorio, con `id`, `nombre` y `precio` |
| `encargos[].dulce.id` | number | entero positivo. Es la clave primaria del catálogo |
| `encargos[].dulce.nombre` | string | no vacío |
| `encargos[].dulce.precio` | number | mayor que 0 |
| `encargos[].cantidad` | number | entero, mínimo 1 |

```bash
curl -X POST localhost:3000/delys/pedido \
  -H "Authorization: Bearer eyJ..." \
  -H 'content-type: application/json' \
  -d '{
        "encargos": [
          { "dulce": { "id": 1, "nombre": "Charolas surtida", "precio": 1000 }, "cantidad": 2 },
          { "dulce": { "id": 3, "nombre": "Panetela Grande de Chocolate", "precio": 5500 }, "cantidad": 1 }
        ]
      }'
```

```json
{
  "ok": true,
  "pedido": {
    "id": "f9f64eb3-50d6-4748-8ecd-1847b03af017",
    "precio_total": 7500,
    "encargos": [ { "dulce": { "id": 1, "nombre": "Charolas surtida", "precio": 1000, "imagen_url": null, "imagen_bytes": null }, "cantidad": 2 } ]
  }
}
```

`precio_total` lo calcula el servidor: 2 × 1000 + 1 × 5500 = 7500. Mandar `"dulce": 1` en vez del objeto da `400` ("nested property dulce must be either object or array").

---

### 2.12 `GET /delys/pedidos`

Lista todos los pedidos. Requiere token `delys`. Sin parámetros.

```bash
curl localhost:3000/delys/pedidos -H "Authorization: Bearer eyJ..."
# -> { "pedidos": [ { "id": "f9f64eb3-...", "precio_total": 7500, "encargos": [ ... ] } ] }
```

Cada pedido viene con sus encargos y cada encargo con su dulce completo.

---

### 2.13 `GET /delys/pedidos/:id`

Un pedido. Requiere token `delys`.

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `id` (path) | string | **UUID v4**. Cualquier otro formato da `400` |

```bash
curl localhost:3000/delys/pedidos/f9f64eb3-50d6-4748-8ecd-1847b03af017 \
  -H "Authorization: Bearer eyJ..."
```

```json
{ "id": "f9f64eb3-50d6-4748-8ecd-1847b03af017", "precio_total": 7500, "encargos": [ ... ] }
```

Un UUID bien formado pero inexistente da `404`.

---

### 2.14 `DELETE /delys/pedidos/:id`

Borra el pedido. Requiere token `delys`. Mismo parámetro `id` UUID.

```bash
curl -X DELETE localhost:3000/delys/pedidos/f9f64eb3-50d6-4748-8ecd-1847b03af017 \
  -H "Authorization: Bearer eyJ..."
# -> { "ok": true }
```

---

### 2.15 `POST /delys/dulces/:id/imagen`

Sube la imagen de un dulce a Supabase Storage. Requiere token `delys`. En la base de datos solo queda la URL y el tamaño: el binario no pasa por Postgres ni se escribe en disco (multer lo recibe en memoria).

**No es JSON**, es `multipart/form-data`.

| Parámetro | Dónde | Tipo | Reglas |
| --- | --- | --- | --- |
| `id` | path | number | entero. Si no existe el dulce, `400` |
| `imagen` | form-data | archivo | obligatorio. Solo `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Máximo 50 MB |

```bash
curl -X POST localhost:3000/delys/dulces/1/imagen \
  -H "Authorization: Bearer eyJ..." \
  -F imagen=@pastel.png
```

```json
{
  "mensaje": "Imagen subida correctamente",
  "dulce": { "id": 1, "nombre": "Charolas surtida", "precio": 1000,
             "imagen_url": "https://lgaenkcgglmzmyvijkap.supabase.co/storage/v1/object/public/delys/dulces/9f2c....png",
             "imagen_bytes": 284913 },
  "cuota": { "rol": "delys", "bytes_usados": 284913, "limite_bytes": 20971520, "bytes_disponibles": 20686607 }
}
```

Casos que se verificaron:

| Situación | Respuesta |
| --- | --- |
| Sin archivo en el form | `400` "Falta el archivo. Envíalo como multipart/form-data en el campo \"imagen\"" |
| Un `.txt` o un PDF | `400` "Tipo de archivo no permitido: text/plain. Usa image/jpeg, image/png, image/webp, image/gif" |
| `id` de dulce inexistente | `400` "No existe el dulce 99" |
| Token de otro proyecto | `403` |
| Sin token | `401` |
| Sin credenciales de Supabase en el `.env` | `503`, y la cuota reservada se devuelve sola |
| La imagen no cabe en la cuota | `400` con el detalle |

Ejemplo del `400` por cuota:

```json
{
  "message": "La cuota de \"delys\" no alcanza para esta imagen: usa 0 de 50 bytes (50 disponibles) y la imagen pesa 70 bytes",
  "error": "Bad Request",
  "statusCode": 400
}
```

Lo que decide el servidor y no el cliente: el tamaño es el que midió Multer (`file.size`), el nombre del archivo lo genera el servidor (`dulces/<uuid>.<ext>`), y la cuota que se consume es la del **rol del token**. Un campo `bytes` en el body se ignora.

Subir otra imagen sobre el mismo dulce **reemplaza** la anterior: la vieja se borra de Storage y sus bytes vuelven a la cuota.

---

### 2.16 `DELETE /delys/dulces/:id/imagen`

Quita la imagen de un dulce. Requiere token `delys`.

| Parámetro | Dónde | Tipo | Reglas |
| --- | --- | --- | --- |
| `id` | path | number | entero. Si el dulce no tiene imagen, `400` |

```bash
curl -X DELETE localhost:3000/delys/dulces/1/imagen -H "Authorization: Bearer eyJ..."
```

```json
{
  "mensaje": "Imagen eliminada",
  "dulce": { "id": 1, "nombre": "Charolas surtida", "precio": 1000, "imagen_url": null, "imagen_bytes": null },
  "cuota": { "rol": "delys", "bytes_usados": 0, "limite_bytes": 20971520, "bytes_disponibles": 20971520 }
}
```

El dulce sigue en el catálogo; solo pierde la foto. Es la forma de devolver los bytes a la cuota.

---

## 3. Cómo probarlo de punta a punta

```bash
npm run build && npm start

# 1. Primer usuario del proyecto (solo la primera vez)
curl -X POST localhost:3000/auth/registro -H 'content-type: application/json' \
  -d '{"nombre":"Propietaria","usuario":"propietaria","password":"una-clave-larga","rol":"delys"}'

# 2. Token
TOKEN=$(curl -s -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"usuario":"propietaria","password":"una-clave-larga"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).access_token')

# 3. Cuota antes de subir nada
curl localhost:3000/storage/quota -H "Authorization: Bearer $TOKEN"

# 4. Subir una imagen
curl -X POST localhost:3000/delys/dulces/1/imagen -H "Authorization: Bearer $TOKEN" -F imagen=@pastel.png

# 5. Ver la cuota consumida
curl localhost:3000/storage/quota -H "Authorization: Bearer $TOKEN"

# 6. Borrar la imagen y ver los bytes de vuelta
curl -X DELETE localhost:3000/delys/dulces/1/imagen -H "Authorization: Bearer $TOKEN"
curl localhost:3000/storage/quota -H "Authorization: Bearer $TOKEN"
```

Los pasos 4 a 6 necesitan la `SUPABASE_SERVICE_ROLE_KEY` real en `.env` y el bucket `delys` creado y público en el panel de Supabase.
