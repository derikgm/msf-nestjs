# NestJS + Wasmer

This example shows how to run **NestJS** on **Wasmer Edge** as an HTTP server.

## Demo

`https://<your-subdomain>.wasmer.app/` (deploy to get a live URL)

## How it Works

* `server.js` exposes a small Node HTTP endpoint for the runtime example.
* `package.json` includes NestJS core, platform, and RxJS dependencies.
* Wasmer Edge runs the Node.js process and forwards HTTP traffic to the configured port.

## Running Locally

```bash
npm install
npm run build   # compila src/ a dist/ (server.js carga dist/app.module.js)
npm start
```

Open `http://127.0.0.1:3000/ping` to hit the server locally. Set `PORT=...` if you want to use a different port.

`npm run dev` compila y arranca en un solo paso. La conexión a Postgres sale de `DATABASE_URL` (`.env`) y TypeORM sincroniza el esquema al arrancar.

## Autenticación

Todo endpoint exige un token **salvo los marcados con `@Public()`** (`src/auth/public.decorator.ts`): el `JwtAuthGuard` está registrado como `APP_GUARD`, así que si agregas una ruta nueva nace protegida y solo hay que abrirla a propósito.

Cada token lleva un **rol** y hay dos guards: el de autenticación (firma + que el usuario siga activo en la BD) y el de roles (`@Roles('delys')`), que además corre como `APP_GUARD`. Sin los dos, un usuario de un proyecto podría leer pedidos de otro.

| Ruta | Rol |
| --- | --- |
| `GET /ping`, `GET /delys/dulces`, `GET /delys/ofertas`, `POST /auth/login` | público |
| `POST /auth/registro` | público **solo** mientras el rol no tenga ningún usuario |
| `POST /delys/pedido`, `GET /delys/pedidos`, `GET /delys/pedidos/:id`, `DELETE /delys/pedidos/:id` | `delys` |
| `POST /delys/dulces/:id/imagen`, `DELETE /delys/dulces/:id/imagen` | `delys` |
| `POST /auth/usuarios`, `POST /auth/cambiar-password`, `GET /auth/yo`, `GET /storage/quota` | el que sea |

### El modelo de usuarios

El rol **es** el proyecto: `delys`, `domus`. No hay un superusuario que vea los dos; cada usuario solo ve lo de su proyecto. La excepción es `admin`: administra la plataforma y `RolesGuard` lo deja entrar a cualquier ruta con `@Roles()`, sin tocar los decoradores uno por uno. El aislamiento entre `delys` y `domus` no se toca.

`POST /auth/registro` está abierto mientras el rol esté vacío, que es el arranque de cada proyecto: el primer usuario se registra solo y a partir de ahí el registro se cierra. Para meter más gente en ese proyecto hay que estar autenticado con `@Roles` de ese mismo rol:

```bash
# 1. Primer usuario del proyecto (tabla vacía)
curl -X POST localhost:3000/auth/registro \
  -H 'content-type: application/json' \
  -d '{"nombre":"Propietaria","usuario":"propietaria","password":"una-clave-larga","rol":"delys"}'

# 2. Token
curl -X POST localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"usuario":"propietaria","password":"una-clave-larga"}'
# -> { "access_token": "eyJ...", "token_type": "Bearer", "expires_in": 28800 }

# 3. Alta de más gente del proyecto (el rol sale del token, no del body)
curl -X POST localhost:3000/auth/usuarios \
  -H "Authorization: Bearer eyJ..." -H 'content-type: application/json' \
  -d '{"nombre":"Familiar","usuario":"familiar","password":"otra-clave-larga"}'
```

Enviar `rol` en el body de `/auth/usuarios` no sirve de nada: se ignora y se usa el del token, así que nadie puede asignarse un proyecto ajeno.

La contraseña se compara con `scrypt` + `timingSafeEqual` (`src/auth/password.util.ts`), sin dependencias nativas, contra el hash de la fila de `usuario`. El login siempre calcula un hash aunque el usuario no exista, para que el tiempo de respuesta no delate qué usuarios existen.

Variables de entorno (`.env`):

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Postgres |
| `AUTH_JWT_SECRET` | Firma de los tokens. Genera uno con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `AUTH_JWT_EXPIRES_IN` | Vigencia del token: `30m`, `8h`, `7d` |
| `SUPABASE_URL` | Proyecto de Supabase (Storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | Acceso a Storage. **Nunca** al frontend |

Si falta `AUTH_JWT_SECRET` la app **no arranca**: es preferible fallar al inicio que devolver 500 en la primera petición. Las variables de Supabase sí son perezosas: si faltan, solo fallan las rutas de imagen (503), el resto sigue sirviendo.

En Wasmer **no subas `.env`**: define las cuatro variables como variables de entorno del despliegue.

## Imágenes de los dulces

`POST /delys/dulces/:id/imagen` (multipart/form-data, campo `imagen`) sube el archivo a Supabase Storage y guarda **solo la URL pública** y el tamaño en la BD; el binario nunca pasa por la base de datos ni se queda en disco (multer usa memoria). `DELETE` en la misma ruta borra el archivo y lo baja del catálogo.

```bash
curl -X POST localhost:3000/delys/dulces/1/imagen \
  -H "Authorization: Bearer eyJ..." -F imagen=@pastel.png
# -> { "mensaje": "Imagen subida correctamente", "dulce": {...}, "cuota": {...} }

curl -X DELETE localhost:3000/delys/dulces/1/imagen -H "Authorization: Bearer eyJ..."
```

El bucket es el del rol (`delys`/`domus`), o sea un bucket por proyecto. Cada bucket tiene que existir y ser público de lectura en el panel de Supabase.

Lo que decide el servidor, no el cliente:

* el tamaño es el que midió Multer (`file.size`), nunca un campo del formulario;
* solo se aceptan `image/jpeg`, `image/png`, `image/webp` y `image/gif`;
* el tamaño máximo por archivo es 50 MB (tope del plan Free de Supabase), pero el que manda es la cuota del rol;
* la cuota que se consume es la del **rol del token**, nunca una que venga en el body;
* el nombre del archivo lo genera el servidor (`dulces/<uuid>.<ext>`), no el que se manda.

## Cuotas de almacenamiento

`GET /storage/quota` devuelve el estado del rol del token:

```json
{ "rol": "delys", "bytes_usados": 5242880, "limite_bytes": 20971520, "bytes_disponibles": 15728640 }
```

La cuota es **por proyecto, no por usuario**: los cuatro empleados de `delys` comparten los mismos 20 MB. Para cambiar el límite se edita la fila:

```sql
UPDATE storage_quota SET limite_bytes = 52428800 WHERE rol = 'delys';
```

Un proyecto nuevo es un `INSERT` en `storage_quota` y nada más:

```sql
INSERT INTO storage_quota (rol, bytes_usados, limite_bytes) VALUES ('delys-domicilio', 0, 20971520);
```

Cómo se mantiene el contador:

* al subir se **reserva** antes de subir el archivo con un `UPDATE` condicional (`bytes_usados + n <= limite_bytes`), que es atómico y a prueba de dos subidas a la vez;
* si el archivo no llega a subir, los bytes reservados se devuelven;
* al borrar una imagen, o al reemplazarla por otra, se liberan los bytes de la anterior;
* si no alcanza, la respuesta es un `400` diciendo cuántos bytes se usan, cuántos hay y cuánto pesa el archivo.

Pendiente para producción: limitar intentos de login (`@nestjs/throttler`) y registrar los accesos en un log de auditoría.

## Deploying to Wasmer (Overview)

1. Install dependencies and confirm the app starts locally.
2. Deploy from this example directory with `wasmer deploy`.
3. Visit `https://<your-subdomain>.wasmer.app/` once the deployment is live.
