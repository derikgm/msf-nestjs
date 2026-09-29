# Decisiones

Decisiones ya tomadas y cosas que quedan pendientes antes de producción. Cada una dice **qué** se decidió, **por qué** y **qué falta**.
La referencia de los endpoints está en [API.md](API.md).

Fecha de la última verificación: 2026-09-29 (`npm run build` en verde, endpoints probados contra la BD real de Supabase).

---

## 1. Decisiones tomadas

### 1.1 El precio de los dulces lo manda el servidor (opción A)

**Decisión.** `POST /delys/pedido` recibe **solo el id** del dulce y el precio sale siempre de la tabla `dulce`.

```json
{ "encargos": [ { "dulce": 1, "cantidad": 2 } ] }
```

**Qué se cambió.**

* `src/delys/dto/create-pedido.dto.ts`: `CreateDulceDto` se eliminó. `CreateEncargoDto.dulce` pasó de ser el dulce completo a ser un `number` con `@IsInt() @IsPositive()`.
* `src/delys/delys.service.ts`: `upsertDulce()` se borró. `crearPedido()` llama a `dulcesDelCatalogo()`, que carga con `findBy({ id: In(ids) })`, indexa por id y calcula el total con esos precios.
* Un id que no existe en el catálogo da `404`: `"No existe el dulce 99"` si falta uno, `"No existen los dulces 98, 99"` si faltan varios.

**Por qué.** Un endpoint de pedido no debe escribir el catálogo. Con el DTO viejo, mandar `precio: 1` para un dulce de 1000 salía por 1, y además se podía renombrar un dulce o inventarse uno nuevo con el id que uno quisiera.

**Verificado contra la BD real.** Mandando `{"dulce":1,"cantidad":2,"precio":1,"nombre":"Dulce Barato"}` el `ValidationPipe` descarta los campos que no están en el DTO (`whitelist: true`), el total sale 2000 (el precio del catálogo) y la tabla `dulce` queda intacta. La forma vieja (`"dulce": {"id":1,...}`) da `400`.

**Lo que falta.** Ajustar el cliente Tauri: donde mandaba el objeto del dulce, mandar solo el `id`.

---

### 1.2 Las rutas de pedidos se quedan como están

**Decisión.** Se conservan `GET /delys/pedidos/:id` y `DELETE /delys/pedidos/:id`. No se vuelve a `/delys/:id`.

**Por qué.** Un comodín `GET /delys/:id` convivía con `GET /delys/dulces` (público) y `GET /delys/dulces/:id/imagen`. Hoy funciona porque Nest registra en orden, pero el día que se agregue `GET /delys/ofertas/...` el comodín se puede comer la ruta. Con `pedidos/` delante el emparejamiento es exacto.

**Lo que falta.** Si el cliente Tauri ya consume alguna de las dos, que use `/delys/pedidos/:id`.

---

### 1.3 `admin` es el superusuario

**Decisión.** `'admin'` está en `ROLES` y además es el único rol con paso libre: `RolesGuard` lo deja entrar a **cualquier** ruta con `@Roles()`, sin importar el rol que esa ruta pida.

```ts
// src/auth/roles.guard.ts
if (user.rol === ROL_SUPERUSUARIO) return true;
```

**Qué se cambió.**

* `src/auth/entities/usuario.entity.ts`: `ROLES` incluye `admin` y se exporta `ROL_SUPERUSUARIO` (el nombre, no el literal, para que el guard no dependa de la cadena de texto).
* `src/auth/roles.guard.ts`: una sola línea de paso libre, en vez de añadir `'admin'` a cada `@Roles()` de cada controlador. Así una ruta nueva queda abierta a `admin` sin que haya que acordarse.

**Qué hace y qué no.** `admin` entra a todo: pedidos, imágenes, cuota y usuarios. Lo que **no** hace es saltarse el `@IsIn(ROLES)` de los DTO ni el aislamiento entre los demás roles: un `delys` sigue sin entrar a rutas de `domus`. Cada usuario de `admin` tiene su propia cuota en `storage_quota` (20 MB por defecto), así que las imágenes que suba consumen la de `admin`, no la de `delys`.

**El riesgo que se acepta.** `admin` ve los datos de todos los proyectos, que es justo lo que el diseño original ("el rol es el proyecto") quería evitar. A cambio hay un solo lugar donde revisar quién lo tiene: la tabla `usuario`. Por eso conviene que las cuentas `admin` sean pocas y con contraseñas fuertes.

**Verificado.** Token `admin` creando un pedido (`POST /delys/pedido`), listando pedidos (`GET /delys/pedidos`) y leyendo su cuota. Un token `delys` en esas mismas rutas también funciona, y `/auth/usuarios` con un token `admin` sigue creando usuarios `admin` aunque el body diga `"rol":"delys"`.

---

### 1.4 Un fallo de la base de datos ya no se ve como un token inválido

**Decisión.** El guard separa los tres motivos por los que una petición puede no pasar, y cada uno tiene su mensaje y su código.

| Situación | Código | Mensaje |
| --- | --- | --- |
| No viene cabecera `Authorization` | `401` | "Falta el token. Envíalo como: Authorization: Bearer &lt;token&gt;" |
| Firma inválida o caducada | `401` | "El token no es válido o ya caducó" |
| Usuario desactivado | `401` | "El usuario de este token ya no está activo" |
| La base de datos no respondió | `503` | "No se puede comprobar la sesión en este momento" |

**Por qué.** Antes, `usuarioDelToken()` tenía un solo `try` que cubría la verificación del JWT **y** la consulta `usuarioActivo()`. Si la base de datos se caía, el `catch` devolvía `undefined` y el guard respondía `401 Token inválido, expirado o de un usuario desactivado`. Para el cliente era indistinguible de un token caducado, así que cerraba la sesión y pedía el token de nuevo, sin que hubiera caducado nada.

**Qué se cambió.** `src/auth/auth.guard.ts`: la verificación del JWT y la consulta a la base de datos van en `try` separados, y la consulta tiene el suyo, que loguea el error y lanza `ServiceUnavailableException`.

**Lo que falta.** sigue sin haber reintentos: si la base de datos está caída, la respuesta es `503` y el cliente decide si reintenta. El pooler de Supabase (`aws-0-...pooler.supabase.com`) corta conexiones con facilidad desde redes inestables, y `TypeOrmModule` reintenta solo al arrancar, no en cada consulta.

---

### 1.5 Cosas que también hay que hacer antes de producción

No son decisiones, solo recordatorios que quedaron sueltos:

* Falta la `SUPABASE_SERVICE_ROLE_KEY` real en `.env` (ahora está el marcador) y hay que crear los buckets `delys` y `domus` públicos de lectura en el panel de Supabase. Hasta eso, la subida real no se pudo probar: el `503` que devolvía era el guard de credenciales, no un fallo de la lógica.
* No hay límite de intentos de login (`@nestjs/throttler`) ni log de auditoría.
* La tabla `storage_quota` se crea sola con `synchronize: true`. Cuando eso se desactive hay que generar la migración de `usuario`, `storage_quota` y la columna `dulce.imagen_bytes` / `dulce.imagen_url`.
