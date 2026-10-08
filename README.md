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
| `GET /ping`, `GET /delys/dulces`, `GET /delys/ofertas`, `GET /delys/secciones`, `GET /adc/productos`, `GET /adc/secciones`, `POST /auth/login` | público |
| `POST /auth/registro` | público **solo** mientras el rol no tenga ningún usuario |
| `POST /delys/pedido` | **público** (el cliente no tiene cuenta) |
| `GET /delys/pedidos`, `GET /delys/pedidos/:id`, `DELETE /delys/pedidos/:id` | `delys` |
| `POST /delys/dulces/:id/imagen`, `DELETE /delys/dulces/:id/imagen` | `delys` |
| `POST /delys/secciones`, `POST /adc/secciones` | `delys` / `adc` (secciones del panel) |
| `POST /auth/usuarios`, `POST /auth/cambiar-password`, `GET /auth/yo`, `GET /storage/quota` | el que sea |
| `POST /auth/admin/usuarios` | **solo `admin`**, crea usuarios y les asigna el rol |

### El modelo de usuarios

El rol **es** el proyecto: `delys`, `domus`. No hay un superusuario que vea los dos; cada usuario solo ve lo de su proyecto. La excepción es `admin`: administra la plataforma y `RolesGuard` lo deja entrar a cualquier ruta con `@Roles()`, sin tocar los decoradores uno por uno. El aislamiento entre `delys` y `domus` no se toca.

`admin` es además el único que puede **asignar el rol** al crear un usuario: `POST /auth/admin/usuarios` recibe `rol` en el cuerpo (en `POST /auth/usuarios` ese campo se ignora, el rol sale del token).

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

Variables de entorno (`.env`). La lista completa de claves, con valores de
ejemplo y sin secretos, está en **`.env.example`**: `cp .env.example .env` y
rellenar. El `.env` real está en `.gitignore` y no se sube nunca.

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Postgres |
| `DB_SSL` | `false` apaga el TLS de la BD (Postgres local sin certificados). Sin definir se asume SSL, que es lo que exige Supabase |
| `DB_CA_CERT` | Lista de confianza del certificado de la BD (N-6): el pem de la CA en una sola línea, con `\n`. Si se define, la conexión pasa a `rejectUnauthorized: true` y solo acepta certificados firmados por esa CA; si no, se mantiene el comportamiento de siempre (`rejectUnauthorized: false`) |
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

El bucket es el del rol (`delys`/`domus`/`adc`), o sea un bucket por proyecto. Los tres están declarados en `BUCKET_POR_ROL` (`src/common/services/dulce-imagen.service.ts`) y **los que falten los crea el propio servidor en la primera subida**: si Storage contesta *Bucket not found*, `SupabaseService` crea el bucket (público de lectura, como `delys`) y repite la subida. El de `adc` se creó el 2026-10-07, cuando la subida de una foto devolvía `500` porque no existía.

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

## Límite de peticiones (rate limiting)

Desde 2026-10-07 (`@nestjs/throttler`, N-5) la API corta a quien sature:

| Dónde | Límite |
| --- | --- |
| Cualquier ruta | `300` peticiones por minuto e IP |
| `POST /auth/login`, `POST /auth/registro`, `POST /delys/pedido` y `POST /adc/pedido` | `10` por minuto e IP |

Se responde con `429 {"statusCode":429,"message":"ThrottlerException: Too Many Requests"}` y la
ventana vuelve a estar libre a los `60` segundos. Las `GET` de las tiendas públicas están muy por
debajo del techo general: recorrer el catálogo no dispara nada.

Dos detalles que no conviene tocar a la ligera:

* el `ttl` va en **milisegundos** (`minutes(1)` es `60000`); cambiarlo por `60` reduciría la
  ventana a 60 milisegundos;
* `server.js` pone `app.set('trust proxy', 1)`: detrás del proxy de Wasmer la IP que llega es la
  suya, y sin ese ajuste todos los visitantes contarían en el mismo cubo y una tienda llena se
  bloquearía sola. Con `1` solo se fía el último salto que pone el proxy.

Sigue pendiente para producción: registrar los accesos en un log de auditoría.

## Cambiar el esquema de la base de datos

Desde 2026-10-07 el servidor **no** ajusta el esquema solo: `synchronize` está en `false` (N-4).
Antes estaba en `true` y TypeORM adivinaba el esquema en cada arranque: añadía columnas y, sobre
todo, **borraba** las que la entidad no conocía (véase la advertencia de `migraciones/001-moneda.sql`,
donde una columna aparecía y desaparecía al enfriarse Wasmer). Ahora el esquema solo cambia con una
migración, y `migrationsRun` la aplica al arrancar.

Cómo se hace un cambio:

```bash
npm run build     # no hay ts-node: el CLI trabaja contra dist/
node --env-file=.env node_modules/.bin/typeorm migration:generate -d dist/data-source.js <nombre>
# -> se crea src/migraciones/<timestamp>-<nombre>.ts; revisarlo
git add src/migraciones/ && git commit   # y desplegar: se aplica sola al arrancar
```

Útiles:

```bash
node --env-file=.env node_modules/.bin/typeorm migration:show -d dist/data-source.js   # pendientes
node --env-file=.env node_modules/.bin/typeorm migration:run  -d dist/data-source.js   # aplicar a mano
```

Aviso: el `DATABASE_URL` del `.env` es el de producción. `migration:generate` solo lee, pero
`migration:run` ejecuta: mirar bien a qué base apunta.

La de línea base (`src/migraciones/1791390744944-Inicial.ts`) deja escrito el esquema que tenían
las bases creadas hasta ahora. En esas bases **no hace nada** (se salta si la tabla `producto` ya
existe) y su `down()` no borra nada: una línea base no se revierte, eso es trabajo de una copia
de seguridad. Las bases nuevas sí la crean entera.

## Deploying to Wasmer (Overview)

1. Install dependencies and confirm the app starts locally.
2. Deploy from this example directory with `wasmer deploy`.
3. Visit `https://<your-subdomain>.wasmer.app/` once the deployment is live.
