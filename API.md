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
| `GET` | `/delys/secciones` | público |
| `POST` | `/delys/secciones` | `delys` o `admin`, **alta de sección** |
| `GET` | `/adc/productos` | público, devuelve `productos` **y** `secciones` |
| `POST` | `/adc/productos/:id/imagen` | `adc` o `admin`, sube la foto; la respuesta trae la clave **`producto`** (no `dulce`) |
| `DELETE` | `/adc/productos/:id/imagen` | `adc` o `admin`, quita la foto; igual, clave **`producto`** |
| `GET` | `/adc/secciones` | público |
| `POST` | `/adc/secciones` | `adc` o `admin`, **alta de sección** |
| `PATCH` | `/adc/secciones/:id` | `adc` o `admin`, **renombra una sección** |
| `DELETE` | `/adc/secciones/:id` | `adc` o `admin`, **borra una sección vacía** |
| `POST` | `/auth/login` | público |
| `POST` | `/auth/registro` | público, **solo** mientras el rol no tenga usuarios |
| `POST` | `/auth/usuarios` | cualquier rol, crea usuarios **de ese mismo rol** |
| `POST` | `/auth/admin/usuarios` | **solo `admin`**, crea usuarios y les asigna el rol |
| `POST` | `/auth/cambiar-password` | cualquier rol, solo la propia contraseña |
| `GET` | `/auth/yo` | cualquier rol |
| `GET` | `/auth/usuarios` | **solo `admin`**, lista todos los usuarios |
| `PATCH` | `/auth/usuarios/:id` | **solo `admin`**, cambia `rol` y/o `activo` |
| `DELETE` | `/auth/usuarios/:id` | **solo `admin`**, borra el usuario |
| `GET` | `/storage/quota` | cualquier rol, devuelve la cuota de su proyecto |
| `POST` | `/delys/dulces` | `delys` o `admin`, **alta en el catálogo** |
| `PATCH` | `/delys/dulces/:id` | `delys` o `admin`, **edita nombre, precio, moneda o sección** |
| `DELETE` | `/delys/dulces/:id` | `delys` o `admin`, **borra del catálogo** |
| `POST` | `/delys/pedido` | **público** |
| `GET` | `/delys/pedidos` | `delys` o `admin` |
| `GET` | `/delys/pedidos/:id` | `delys` o `admin` |
| `DELETE` | `/delys/pedidos/:id` | `delys` o `admin` |
| `POST` | `/delys/dulces/:id/imagen` | `delys` o `admin` |
| `DELETE` | `/delys/dulces/:id/imagen` | `delys` o `admin` |

`admin` es el único rol con paso libre: `RolesGuard` lo deja entrar a cualquier ruta con `@Roles()`, sin importar el rol que pida. El resto de roles solo ven lo de su propio proyecto (ver [Decisiones.md](Decisiones.md), punto 1.3).

Las rutas públicas son las que puede usar alguien sin cuenta: mirar el catálogo y **enviar un pedido**. El cliente de la pastelería no tiene credenciales, así que el alta de pedidos no lleva token. El resto de rutas de pedidos (`GET`/`DELETE`) sí lo exigen, porque son las del panel.

Formato de errores, siempre el mismo:

```json
{ "message": "No existe el dulce 99", "error": "Bad Request", "statusCode": 400 }
```

Códigos usados: `400` datos inválidos o cuota insuficiente, `401` sin token / token caducado / contraseña incorrecta / usuario desactivado, `403` rol que no es el del proyecto, `404` recurso inexistente, `409` `usuario` repetido, `429` demasiadas peticiones (más abajo), `503` falta la configuración de Supabase **o** la base de datos no respondió.

Hay **límite de peticiones** (`@nestjs/throttler`): `300` por minuto e IP en cualquier ruta, y `10` por minuto e IP en `POST /auth/login`, `POST /auth/registro`, `POST /delys/pedido` y `POST /adc/pedido`. Al pasarlo responde `429` con `"message": "ThrottlerException: Too Many Requests"` y la ventana vuelve a estar libre a los 60 segundos. **Los GET públicos de catálogo están exentos** (`@SkipThrottle()`): `GET /delys/dulces`, `GET /delys/ofertas`, `GET /delys/secciones`, `GET /adc/productos` y `GET /adc/secciones` no devuelven nunca `429`.

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
| `rol` | string | opcional, `delys`, `domus` o `adc`. Si se omite, `delys`. **Nunca `admin`**: sin token esta ruta no crea superusuarios (ver más abajo) |

> **`admin` no se puede crear aquí.** Si el rol `admin` está vacío, esta ruta
> hubiera permitido que cualquiera se hiciera superusuario; ahora responde
> `403` con ese motivo. Para el primer administrador hay que usar
> `POST /auth/admin/usuarios` (con token de admin existente) o crearlo desde el
> servidor.

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

### 5.1. `POST /auth/admin/usuarios`

Alta de plataforma: **solo un administrador** (rol `admin`) puede consumirla, y es la única forma de crear un usuario y **asignarle el rol** que quieras (cualquier proyecto o un `admin` nuevo). Requiere `Authorization: Bearer <token>`; un token de otro rol recibe `403`.

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | string | obligatorio, máx. 120 |
| `usuario` | string | obligatorio, máx. 60, único |
| `password` | string | obligatorio, entre 8 y 200 caracteres |
| `rol` | string | **obligatorio**, uno de `delys`, `domus`, `adc`, `admin` |

```bash
curl -X POST localhost:3000/auth/admin/usuarios \
  -H "Authorization: Bearer eyJ..." \
  -H 'content-type: application/json' \
  -d '{"nombre":"Pedro","usuario":"pedro","password":"clave-de-pedro","rol":"domus"}'
```

Mismo cuerpo de respuesta que `/auth/registro`. Un `usuario` repetido da `409` y un rol que no esté en la lista da `400`.

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

### 7.1. `GET /auth/usuarios`

Listado de usuarios para el panel de administración. **Solo `admin`** (JWT + `@Roles('admin')`); cualquier otro rol recibe `403`.

```bash
curl localhost:3000/auth/usuarios -H "Authorization: Bearer eyJ..."
```

```json
{
  "usuarios": [
    {
      "id": "8afce1d2-...",
      "nombre": "Mari",
      "usuario": "mari",
      "rol": "delys",
      "activo": true,
      "creado_en": "2026-01-15T10:20:30.000Z"
    }
  ]
}
```

Ordenado por `creado_en` de más reciente a más antiguo. **La contraseña nunca aparece** (`password_hash` es `select: false`).

---

### 7.2. `PATCH /auth/usuarios/:id`

Cambia el rol y/o el flag `activo` de un usuario. **Solo `admin`**. El `id` debe ser un UUID (si no, `400`).

```bash
curl -X PATCH localhost:3000/auth/usuarios/8afce1d2-... \
  -H 'content-type: application/json' -H "Authorization: Bearer eyJ..." \
  -d '{"activo": false}'
```

```json
{
  "mensaje": "Usuario actualizado",
  "usuario": { "id": "8afce1d2-...", "nombre": "Mari", "usuario": "mari", "rol": "delys", "activo": false, "creado_en": "2026-01-15T10:20:30.000Z" }
}
```

- Los dos campos son opcionales y se pueden mandar juntos (`{"rol": "adc", "activo": true}`).
- `rol` acepta solo los valores del enum `ROLES` (`delys`, `domus`, `adc`, `admin`); otro valor da `400`.
- `activo: false` retira el acceso **al instante**: `JwtAuthGuard` comprueba el flag en cada petición y el siguiente intento con ese token devuelve `401`.
- Usuario inexistente → `404`.

---

### 7.3. `DELETE /auth/usuarios/:id`

Borra el usuario. **Solo `admin`**.

```bash
curl -X DELETE localhost:3000/auth/usuarios/8afce1d2-... -H "Authorization: Bearer eyJ..."
```

```json
{ "mensaje": "Usuario eliminado" }
```

No hay protección contra borrarse a uno mismo ni contra dejar un rol sin usuarios: si hace falta rellenarlo, se crea otro con `POST /auth/usuarios` (o el registro inicial mientras el rol esté vacío). Usuario inexistente → `404`.

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
    { "id": 1, "nombre": "Charolas surtida", "precio": 1000, "imagen_url": null, "imagen_bytes": null, "moneda": "CUP" }
  ]
}
```

`imagen_url` es `null` hasta que se suba una imagen por `/delys/dulces/:id/imagen`; `imagen_bytes` es el tamaño del archivo y existe para poder devolver los bytes a la cuota al borrar.

`moneda` es la moneda en la que se lee `precio`. Es **texto de hasta 8 letras y no un enum** (`varchar(8)`, por defecto `CUP`): así caben hoy `USD`, `EUR`, `MLC`… y mañana otra sin migrar nada ni tocar el servidor. Las filas que ya existían en la base se crearon todas en `CUP`.

---

### 10. `GET /delys/ofertas`

Texto de las ofertas (sin imágenes). Sin token.

```bash
curl localhost:3000/delys/ofertas
# -> { "ofertas": [ { "id": 1, "nombre": "Charolas surtida", "precio": 1000, "imagen_url": null, "moneda": "CUP" } ] }
```

---

### 11. `POST /delys/pedido`

Crea un pedido. **Ruta pública: no hace falta token.** El cliente de la pastelería no tiene cuenta, así que el pedido entra sin credenciales. Ver y borrar pedidos sí exige rol `delys` (secciones 12 a 14).

**El `dulce` es solo el id.** El nombre y el precio los pone el servidor leyéndolos del catálogo: mandarlos en el body no sirve de nada (ver [Decisiones.md](Decisiones.md), punto 1.1).

**La fecha no puede ser de ayer.** `fecha` es el día de la entrega en `YYYY-MM-DD`, y el servidor rechaza cualquier fecha anterior a hoy (ver [Decisiones.md](Decisiones.md), punto 1.6).

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `direccion` | string | obligatorio, no vacío, máx. 300 caracteres |
| `telefono` | string | obligatorio, no vacío, de 7 a 40 caracteres |
| `fecha` | string | obligatorio, `YYYY-MM-DD`, no puede ser anterior a hoy |
| `notas` | string | opcional, máx. 1000 caracteres. Si no viene o viene en blanco se guarda como `null` |
| `encargos` | array | obligatorio, mínimo 1 elemento |
| `encargos[].dulce` | number | entero positivo. Es la clave primaria del catálogo. **Ojo: el nombre del campo es `dulce`, no `dulce_id`** |
| `encargos[].cantidad` | number | entero, mínimo 1 |

```bash
curl -X POST localhost:3000/delys/pedido \
  -H 'content-type: application/json' \
  -d '{
        "direccion": "Calle Reforma 222, Centro",
        "telefono": "5512345678",
        "fecha": "2026-10-05",
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
| `fecha` de hoy o posterior | correcto (hoy mismo sigue aceptándose aunque ya sea tarde) |
| `fecha: "2026-02-31"`, fecha que no existe | `400` "fecha debe ser una fecha de la forma YYYY-MM-DD" |
| `fecha: "05/10/2026"`, formato otro | `400` "fecha debe ser una fecha de la forma YYYY-MM-DD" |
| `fecha: "2026-10-05T10:00:00Z"`, con hora | `400` "fecha debe ser una fecha de la forma YYYY-MM-DD" |
| sin `direccion` / `telefono` / `fecha` | `400` |
| `telefono: "123"` (menos de 7) | `400` "El teléfono debe tener al menos 7 caracteres" |
| sin `notas` | correcto, se guarda `null` |

Una diferencia con el resto de la API: aquí no hay `401` ni `403` por falta de token, porque no se comprueba. Lo único que puede salir mal es el `400` de validación y el `404` de un dulce inexistente.

**Pendiente:** esta ruta acepta peticiones de cualquiera, sin límite. Cuando se conecte `@nestjs/throttler` hay que decidir el tope (por IP y/o por `telefono`) antes de abrirla al público de verdad.

---

### 12. `GET /delys/pedidos`

Lista todos los pedidos. Requiere token `delys`. Sin parámetros.

```bash
curl localhost:3000/delys/pedidos -H "Authorization: Bearer eyJ..."
# -> { "pedidos": [ { "id": "f9f64eb3-...", "precio_total": 7500, "direccion": "...", "telefono": "...", "fecha": "2026-10-05", "notas": null, "encargos": [ ... ] } ] }
```

Cada pedido viene con sus encargos y cada encargo con su dulce completo.

`direccion`, `telefono` y `fecha` salen como `null` en los pedidos creados antes de que existieran estos campos. El cliente tiene que tolerarlos.

---

### 13. `GET /delys/pedidos/:id`

Un pedido. Requiere token `delys`.

Los mismos campos que en el listado, más `id`. `null` en los tres datos de entrega si el pedido es anterior a estos campos.

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

### 17. `POST /delys/dulces`

Alta de un dulce en el catálogo, desde el panel de la pastelería. Requiere token `delys`.

**El `id` no se manda: lo asigna el servidor** (el siguiente libre, `MAX(id) + 1`). La tabla `dulce` usa el id como clave primaria sin autogenerar y la sembró `data/ofertas.ts` con ids a mano, así que aceptarlo del cliente dejaría pisar dulces existentes.

| Parámetro | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | string | obligatorio, no vacío, máx. 120 |
| `precio` | number | obligatorio, 0 o mayor, hasta 2 decimales |
| `moneda` | string | opcional, máx. 8 letras; sin ella nace en `CUP` |

```bash
curl -X POST localhost:3000/delys/dulces \
  -H "Authorization: Bearer eyJ..." \
  -H 'content-type: application/json' \
  -d '{"nombre":"Concha de chocolate","precio":1800,"moneda":"USD"}'
```

```json
{
  "mensaje": "Dulce creado correctamente",
  "dulce": { "id": 12, "nombre": "Concha de chocolate", "precio": 1800, "imagen_url": null, "imagen_bytes": null, "moneda": "USD" }
}
```

El dulce nace sin imagen: se sube aparte con la sección 15.

| Situación | Respuesta |
| --- | --- |
| Sin token | `401` |
| Token de otro proyecto | `403` |
| `"nombre": ""` | `400` |
| `"precio": -5` | `400` |
| `"precio": "mucho"` | `400` |
| `"moneda": "SUPERLARGA"` (más de 8 letras) | `400` |
| sin `"moneda"` | correcto: nace en `CUP` |
| mandar `"id": 1` | se ignora: el id lo pone el servidor (`whitelist: true`) |
| mandar `"imagen_url": "..."` | se ignora |

El alta va en transacción. Dos altas simultáneas calcularían el mismo id y la restricción de clave primaria hace que una gane y la otra reciba un error de duplicado.

---

### 18. `PATCH /delys/dulces/:id`

Edita un dulce. Requiere token `delys`. Se manda **solo lo que cambia**.

| Parámetro | Dónde | Tipo | Reglas |
| --- | --- | --- | --- |
| `id` | path | number | entero |
| `nombre` | body | string | opcional, no vacío, máx. 120 |
| `precio` | body | number | opcional, 0 o mayor, hasta 2 decimales |
| `moneda` | body | string | opcional, máx. 8 letras; si no se manda, no se toca |

```bash
curl -X PATCH localhost:3000/delys/dulces/12 \
  -H "Authorization: Bearer eyJ..." \
  -H 'content-type: application/json' \
  -d '{"precio":2100,"moneda":"eur"}'
```

```json
{ "mensaje": "Dulce actualizado correctamente", "dulce": { "id": 12, "nombre": "Concha de chocolate", "precio": 2100, "imagen_url": null, "imagen_bytes": null, "moneda": "EUR" } }
```

| Situación | Respuesta |
| --- | --- |
| Cuerpo `{}` o sin los tres campos | `400` "No hay nada que actualizar: manda \"nombre\", \"precio\" o \"moneda\"" |
| `id` inexistente | `404` "No existe el dulce 99" |
| mandar los tres campos | correcto: cambian los tres |
| mandar `"moneda": " eur "` | correcto: queda `EUR` (se normaliza a mayúsculas) |
| mandar `"imagen_url"` | se ignora: la imagen va por su propia ruta |

---

### 19. `DELETE /delys/dulces/:id`

Borra el dulce del catálogo. Requiere token `delys`. Mismo parámetro `id` entero.

```bash
curl -X DELETE localhost:3000/delys/dulces/12 -H "Authorization: Bearer eyJ..."
# -> { "ok": true }
```

**Antes de borrar la fila libera su imagen**: si el dulce tenía foto, el archivo sale de Supabase Storage y sus bytes vuelven a la cuota del rol. Así no quedan archivos huérfanos ocupando espacio (ver TODO.md, "Cuota de Storage").

**Un dulce que está en un pedido sin resolver no se puede borrar.** El renglón de un encargo forma parte del pedido y `pedido.precio_total` está guardado, no se recalcula: borrarlo dejaría al pedido con un total que no cuadra con sus renglones y sin forma de saber qué se había pedido. Por eso `encargo.dulce_id` es `ON DELETE RESTRICT` y el servicio cuenta los pedidos abiertos antes de borrar.

| Situación | Respuesta |
| --- | --- |
| `id` inexistente | `404` |
| dulce en 1 pedido sin resolver | `409`: `"Charolas surtida" está en 1 pedido sin resolver. Márcalo como hecho o cancélalo en Pedidos, y ya lo podrás borrar.` |
| dulce en varios pedidos sin resolver | `409`, con el número de pedidos: `"..." está en 3 pedidos sin resolver. ...` |
| dulce sin imagen | correcto: no hay nada que liberar |
| Storage sin credenciales o caído | el dulce **se borra igual** y se registra un `warn`; el archivo huérfano queda pendiente de limpiar a mano |
| no se pudo contar los pedidos | `503`: no se borra. Ante la duda se bloquea: perder un pedido es peor que dejar un dulce en el catálogo |

Un dulce se puede borrar siempre que sus pedidos estén resueltos: al resolver un pedido (hecho o cancelado) sus encargos se van en cascada con él y el dulce queda libre.

---

### 20. Secciones del catálogo

El catálogo se navega por secciones (tabla `seccion`), y cada producto pertenece a una (`producto.seccion_id`). La sección **`dulces`** es la especial del catálogo heredado: los productos que existían antes de las secciones (y los que se dan de alta sin `seccion_id`) acaban ahí. **Ambos negocios la enseñan con normalidad**: lo que separa un proyecto de otro es la columna `negocio`, no el nombre de la sección, así que `GET /adc/productos` ya no esconde nada. Ese nombre sí está **reservado**: el panel no puede crear ni renombrar secciones a `dulces`.

Los nombres se guardan en minúsculas (`Electronico` pasa a `electronico`) y deben ser únicos dentro de cada negocio.

#### 20.1. `GET /delys/secciones` y `GET /adc/secciones`

Públicas. Devuelven las secciones del negocio, en orden de creación:

```bash
curl localhost:3000/delys/secciones
# -> { "secciones": [ { "id": 2, "nombre": "dulces" } ] }
curl localhost:3000/adc/secciones
# -> { "secciones": [ { "id": 4, "nombre": "electronico" } ] }
```

#### 20.2. `POST /delys/secciones` y `POST /adc/secciones`

Alta desde el panel, con token del negocio (o `admin`, que entra a todo):

```bash
curl -X POST localhost:3000/adc/secciones -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" -d '{"nombre":"Electronico"}'
# -> { "mensaje": "Sección creada correctamente", "seccion": { "id": 5, "nombre": "electronico", ... } }
```

| Situación | Respuesta |
| --- | --- |
| `nombre` vacío o de más de 60 letras | `400` |
| nombre `dulces` (reservado) | `400`: `"dulces" es la sección reservada del catálogo heredado: elige otro nombre` |
| sección repetida en el mismo negocio | `409`: `La sección "electronico" ya existe` |
| sin token / rol equivocado | `401` / `403` |

#### 20.3. Sección de un producto (`seccion_id`)

`POST /delys/dulces`, `PATCH /delys/dulces/:id` (y sus equivalentes `/adc/productos`) aceptan `seccion_id` opcional. Sin él, el producto cae en la sección `dulces` de su negocio (la que cobija lo heredado):

| Situación | Respuesta |
| --- | --- |
| `seccion_id` de una sección de **otro negocio** | `404`: `No existe la sección 1` |
| producto sin `seccion_id` al crearse | se asigna a `dulces` de su negocio |
| mover un producto con `PATCH` | `PATCH` con `{"seccion_id": 5}`; no hay forma de dejarlo "sin sección", lo más parecido es la propia `dulces` |

#### 20.4. `GET /adc/productos`

Devuelve **productos y secciones** del negocio, con todo lo que haya (también los productos que aún no se hayan movido de `dulces`):

```bash
curl localhost:3000/adc/productos
# -> {
#      "productos": [ { "id": 7, "nombre": "Inversor 1500W", "precio": 18500, "moneda": "CUP",
#                       "imagen_url": null, "seccion_id": 4, "seccion": "electronico" } ],
#      "secciones": [ { "id": 4, "nombre": "electronico" } ]
#    }
```

`/delys/dulces` no cambia de forma: sigue devolviendo los dulces con su `seccion_id` y su objeto `seccion` encima.

#### 20.5. `PATCH /adc/secciones/:id`

Renombra una sección (solo ADC, con token `adc` o `admin`). El cuerpo es el mismo que en el alta: `{"nombre": "nuevo nombre"}`.

```bash
curl -X PATCH localhost:3000/adc/secciones/4 -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" -d '{"nombre":"Paneles solares"}'
# -> { "mensaje": "Sección actualizada correctamente", "seccion": { "id": 4, "nombre": "paneles solares", ... } }
```

| Situación | Respuesta |
| --- | --- |
| la sección no existe o es de otro negocio | `404`: `No existe la sección 4` |
| nombre vacío o `dulces` (reservado) | `400` |
| ya hay otra sección con ese nombre | `409`: `La sección "paneles solares" ya existe` |
| sin token / rol equivocado | `401` / `403` |

El cambio se ve en la tienda en la siguiente lectura: `GET /adc/productos` agrupa por el nombre nuevo y los productos se quedan donde estaban (se mueven desde el panel con `PATCH /adc/productos/:id` y su `seccion_id`).

#### 20.6. `DELETE /adc/secciones/:id`

Borra una sección **vacía** (solo ADC, con token `adc` o `admin`):

```bash
curl -X DELETE localhost:3000/adc/secciones/4 -H "Authorization: Bearer eyJ..."
# -> { "ok": true }
```

| Situación | Respuesta |
| --- | --- |
| la sección no existe o es de otro negocio | `404`: `No existe la sección 4` |
| **tiene productos** | `409`: `La sección "paneles solares" tiene 3 productos: móvelos a otra sección antes de borrarla` |
| es la sección `dulces` (reservada) | `400`: `La sección "dulces" es la de reserva: no se puede borrar` |
| sin token / rol equivocado | `401` / `403` |

No se borra nada con productos dentro, ni se los manda a escondidas: `producto.seccion_id` es una clave foránea sin `ON DELETE`, así que la base lo rechazaría igual, y mandarlos a `dulces` los escondería de la tienda. Primero se reubican (`PATCH` con `seccion_id`) y después se borra la sección.

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
