# API

Referencia de los endpoints: qué reciben, qué devuelven y qué errores dan. Las decisiones de diseño están en [Decisiones.md](Decisiones.md).

Base: `http://127.0.0.1:3000`

Dos guards globales (`src/auth/auth.module.ts`): primero `JwtAuthGuard` (firma del token + que el usuario siga activo en la BD) y después `RolesGuard` (`@Roles('delys')`). **Si una ruta no está marcada con `@Public()`, nace protegida.** El `rol` viaja dentro del token; el cliente nunca lo elige.

## Resumen

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
| `POST` | `/delys/pedido` | `delys` o `admin` |
| `GET` | `/delys/pedidos` | `delys` o `admin` |
| `GET` | `/delys/pedidos/:id` | `delys` o `admin` |
| `DELETE` | `/delys/pedidos/:id` | `delys` o `admin` |
| `POST` | `/delys/dulces/:id/imagen` | `delys` o `admin` |
| `DELETE` | `/delys/dulces/:id/imagen` | `delys` o `admin` |

`admin` es el único rol con paso libre: `RolesGuard` lo deja entrar a cualquier ruta con `@Roles()`, sin importar el rol que pida. El resto de roles solo ven lo de su propio proyecto (ver [Decisiones.md](Decisiones.md), punto 1.3).

Formato de errores, siempre el mismo:

```json
{ "message": "No existe el dulce 99", "error": "Bad Request", "statusCode": 400 }
```

Códigos usados: `400` datos inválidos o cuota insuficiente, `401` sin token / token caducado / contraseña incorrecta / usuario desactivado, `403` rol que no es el del proyecto, `404` recurso inexistente, `409` `usuario` repetido, `503` falta la configuración de Supabase **o** la base de datos no respondió.

Los cuatro fallos del guard tienen mensajes distintos, para que el cliente sepa si tiene que iniciar sesión otra vez o solo reintentar:

| Situación | Respuesta | Qué debe hacer el cliente |
| --- | --- | --- |
| Sin cabecera `Authorization` | `401` "Falta el token. Envíalo como: Authorization: Bearer &lt;token&gt;" | pedir el token |
| Firma inválida o token caducado | `401` "El token no es válido o ya caducó" | iniciar sesión otra vez |
| El usuario fue desactivado | `401` "El usuario de este token ya no está activo" | iniciar sesión otra vez (o mostrar "cuenta desactivada") |
| La base de datos no respondió | `503` "No se puede comprobar la sesión en este momento" | **reintentar**, no cerrar sesión |

---

### 2. `GET /ping`

Health check. Sin parámetros, sin token.

```bash
curl localhost:3000/ping
# -> { "ok": true }
```

---

### 3. `POST /auth/login`

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

### 4. `POST /auth/registro`

Alta del **primer** usuario de un proyecto. Sin token mientras el rol esté vacío; en cuanto el rol tiene un usuario, esta ruta se cierra (401) y hay que usar `/auth/usuarios`.

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | string | obligatorio, máx. 120 |
| `usuario` | string | obligatorio, máx. 60, único |
| `password` | string | obligatorio, entre 8 y 200 caracteres |
| `rol` | string | opcional, `delys`, `domus` o `admin`. Si se omite, `delys` |

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

### 5. `POST /auth/usuarios`

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

### 6. `POST /auth/cambiar-password`

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

### 7. `GET /auth/yo`

Devuelve lo que el token afirma ser el usuario. Sin parámetros.

```bash
curl localhost:3000/auth/yo -H "Authorization: Bearer eyJ..."
```

```json
{ "sub": "8afce1d2-...", "usuario": "propietaria", "rol": "delys", "iat": 1790692239 }
```

---

### 8. `GET /storage/quota`

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

### 9. `GET /delys/dulces`

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

### 10. `GET /delys/ofertas`

Texto de las ofertas (sin imágenes). Sin token.

```bash
curl localhost:3000/delys/ofertas
# -> { "ofertas": [ { "id": 1, "nombre": "Charolas surtida", "precio": 1000, "imagen_url": null } ] }
```

---

### 11. `POST /delys/pedido`

Crea un pedido. Requiere token con rol `delys`.

**El `dulce` es solo el id.** El nombre y el precio los pone el servidor leyéndolos del catálogo: mandarlos en el body no sirve de nada (ver [Decisiones.md](Decisiones.md), punto 1.1).

**La fecha no puede ser de ayer.** `fecha` es el día de la entrega en `YYYY-MM-DD`, y el servidor rechaza cualquier fecha anterior a hoy (ver [Decisiones.md](Decisiones.md), punto 1.6).

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `direccion` | string | obligatorio, no vacío, máx. 300 caracteres |
| `telefono` | string | obligatorio, no vacío, de 7 a 40 caracteres |
| `fecha` | string | obligatorio, `YYYY-MM-DD`, no puede ser anterior a hoy |
| `horario` | string | obligatorio, no vacío, máx. 120 caracteres. Texto libre ("10:00 a 14:00") |
| `notas` | string | opcional, máx. 1000 caracteres. Si no viene o viene en blanco se guarda como `null` |
| `encargos` | array | obligatorio, mínimo 1 elemento |
| `encargos[].dulce` | number | entero positivo. Es la clave primaria del catálogo |
| `encargos[].cantidad` | number | entero, mínimo 1 |

```bash
curl -X POST localhost:3000/delys/pedido \
  -H "Authorization: Bearer eyJ..." \
  -H 'content-type: application/json' \
  -d '{
        "direccion": "Calle Reforma 222, Centro",
        "telefono": "5512345678",
        "fecha": "2026-10-05",
        "horario": "10:00 a 14:00",
        "notas": "Sin azúcar",
        "encargos": [
          { "dulce": 1, "cantidad": 2 },
          { "dulce": 3, "cantidad": 1 }
        ]
      }'
```

```json
{
  "ok": true,
  "pedido": {
    "id": "f9f64eb3-50d6-4748-8ecd-1847b03af017",
    "precio_total": 7500,
    "direccion": "Calle Reforma 222, Centro",
    "telefono": "5512345678",
    "fecha": "2026-10-05",
    "horario": "10:00 a 14:00",
    "notas": "Sin azúcar",
    "encargos": [
      { "id": "2ae13797-...", "dulce": { "id": 1, "nombre": "Charolas surtida", "precio": 1000, "imagen_url": null, "imagen_bytes": null }, "cantidad": 2 },
      { "id": "aa1aa799-...", "dulce": { "id": 3, "nombre": "Panetela Grande de Chocolate", "precio": 5500, "imagen_url": null, "imagen_bytes": null }, "cantidad": 1 }
    ]
  }
}
```

`precio_total` lo calcula el servidor con los precios del catálogo: 2 × 1000 + 1 × 5500 = 7500.

| Situación | Respuesta |
| --- | --- |
| `"dulce": 1` (número) | correcto |
| `"dulce": 99`, id inexistente | `404` "No existe el dulce 99" |
| `"dulce": 98` y `99`, varios inexistentes | `404` "No existen los dulces 98, 99" |
| `"dulce": {"id":1,"nombre":"...","precio":1000}` (forma vieja) | `400` "encargos.0.dulce must be a positive number" |
| `cantidad: 0` | `400` "encargos.0.cantidad must not be less than 1" |
| `precio` o `nombre` dentro del encargo | se ignoran: el total sale del catálogo |
| `precio_total` o `id` en el body | se ignoran: los pone el servidor |
| `fecha` de ayer o anterior | `400` "fecha no puede ser una fecha pasada; usa hoy o una posterior" |
| `fecha` de hoy o posterior | correcto, aunque falte el campo `horario` en la misma hora |
| `fecha: "2026-02-31"`, fecha que no existe | `400` "fecha debe ser una fecha de la forma YYYY-MM-DD" |
| `fecha: "05/10/2026"`, formato otro | `400` "fecha debe ser una fecha de la forma YYYY-MM-DD" |
| `fecha: "2026-10-05T10:00:00Z"`, con hora | `400` "fecha debe ser una fecha de la forma YYYY-MM-DD" |
| sin `direccion` / `telefono` / `fecha` / `horario` | `400` |
| `telefono: "123"` (menos de 7) | `400` "El teléfono debe tener al menos 7 caracteres" |
| sin `notas` | correcto, se guarda `null` |
| Sin token | `401` |

---

### 12. `GET /delys/pedidos`

Lista todos los pedidos. Requiere token `delys`. Sin parámetros.

```bash
curl localhost:3000/delys/pedidos -H "Authorization: Bearer eyJ..."
# -> { "pedidos": [ { "id": "f9f64eb3-...", "precio_total": 7500, "direccion": "...", "telefono": "...", "fecha": "2026-10-05", "horario": "...", "notas": null, "encargos": [ ... ] } ] }
```

Cada pedido viene con sus encargos y cada encargo con su dulce completo.

`direccion`, `telefono`, `fecha` y `horario` salen como `null` en los pedidos creados antes de que existieran estos campos. El cliente tiene que tolerarlos.

---

### 13. `GET /delys/pedidos/:id`

Un pedido. Requiere token `delys`.

Los mismos campos que en el listado, más `id`. `null` en los cuatro datos de entrega si el pedido es anterior a estos campos.

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

### 14. `DELETE /delys/pedidos/:id`

Borra el pedido. Requiere token `delys`. Mismo parámetro `id` UUID.

```bash
curl -X DELETE localhost:3000/delys/pedidos/f9f64eb3-50d6-4748-8ecd-1847b03af017 \
  -H "Authorization: Bearer eyJ..."
# -> { "ok": true }
```

---

### 15. `POST /delys/dulces/:id/imagen`

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

### 16. `DELETE /delys/dulces/:id/imagen`

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

## Cómo probarlo de punta a punta

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
