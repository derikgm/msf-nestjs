# Probar Nhost (rama `feature/nhost`)

Esta rama es un banco de pruebas para ver si Nhost puede sustituir a Supabase
después del bloqueo desde Cuba. **No se despliega**: el proveedor por defecto
sigue siendo Supabase y nada cambia en producción mientras `STORAGE_PROVIDER`
no se ponga en `nhost`.

## Qué cambia en el código

| Pieza | Antes | Ahora |
| --- | --- | --- |
| Postgres | `DATABASE_URL` (Supabase) | Igual: cualquier Postgres, incluido el de Nhost |
| Storage | `SupabaseService` directo en `ImagenService` | Interfaz `StorageService` con dos implementaciones |
| Elección | — | `STORAGE_PROVIDER=supabase\|nhost` (por defecto `supabase`) |
| Nhost | — | `NhostStorageService` (API REST `/v1/files`) |

La autenticación de la aplicación **no cambia**: los JWT los firma
`AUTH_JWT_SECRET` y los usuarios viven en nuestra tabla `usuario`. No usamos
Nhost Auth ni Hasura GraphQL, solo su Postgres y su Storage.

Archivos nuevos:

- `src/common/services/storage.service.ts` — contrato común.
- `src/common/services/nhost-storage.service.ts` — implementación Nhost.
- `src/common/modules/storage/storage.module.ts` — elige el proveedor.
- `scripts/probar-nhost.mjs` — prueba de conexión (base + storage).

## Lo que necesito de ti para la prueba

Rellena estas variables en `msf-nestjs/.env` (no las subas al repo):

```sh
STORAGE_PROVIDER=nhost

# Nhost → Database → Settings → Access: habilita el acceso público y copia
# la cadena que aparece (suele ser un host de pgbouncer).
DATABASE_URL=postgres://postgres:CLAVE@HOST:5432/BASE

# Nhost → Storage: la base de la API, terminada en /v1.
# Ejemplo: https://abcdefgh.storage.sa-east-1.nhost.run/v1
# Si no la encuentras, basta con el subdominio y la región del proyecto
# (los dos primeros trozos de la URL del dashboard) y el servidor la arma solo:
NHOST_STORAGE_URL=
# NHOST_SUBDOMAIN=abcdefgh
# NHOST_REGION=sa-east-1

# Nhost → Settings → Secrets: HASURA_GRAPHQL_ADMIN_SECRET. Se puede guardar
# con cualquiera de los dos nombres.
NHOST_ADMIN_SECRET=

# Opcional: un solo bucket para todo. Si lo dejas vacío, crea los buckets
# `delys`, `adc` y `domus` en Nhost → Storage.
NHOST_BUCKET=default
```

Y en el dashboard de Nhost:

1. **Database → Settings → Access**: activar *Public access*. Sin eso, Wasmer
   (o cualquier servidor fuera de Nhost Run) no puede conectarse.
2. **Storage**: crear el bucket (`default` o los tres por rol).
3. **Storage → Permissions** (abajo del menú lateral): dar al rol `public` el
   permiso **Download**, con una regla `bucket_id` = `default` (o *Without any
   checks* si se quiere abrir todo). Las vitrinas muestran las fotos con un
   `<img src>` normal, sin token; si ese permiso falta, la subida funciona pero
   la imagen da **403**.
4. **Storage → Buckets → Edit**: permitir los MIME de imagen y un tamaño
   máximo razonable (nuestro límite de cuota es aparte).

> En el proyecto de prueba esto ya está aplicado: rol `public`, acción
> Download, sobre el bucket `default`. Si más adelante se usan buckets por rol
> (`delys`, `adc`, `domus`) hay que ampliar la regla para cubrirlos.

Después, desde `msf-nestjs/`:

```sh
node scripts/probar-nhost.mjs
```

El script:

- conecta a `DATABASE_URL` y enseña la base, el usuario y las migraciones;
- sube un PNG de 1×1 al bucket;
- abre la URL pública **sin credenciales** (así se detecta el permiso que
  falta);
- borra el archivo de prueba.

No escribe en las tablas del catálogo. Si todo sale en verde, arranca el
servidor con `npm run dev` y prueba el flujo normal (subir una foto desde el
panel ADC).

## Migrar los datos

El esquema lo aplica el servidor solo (`migrationsRun: true`) en una base
vacía. Faltan los datos:

```sh
# Desde una máquina que sí pueda hablar con Supabase
pg_dump --no-owner --no-privileges "$SUPABASE_DATABASE_URL" > msf.sql

# Contra Nhost
psql "$NHOST_DATABASE_URL" -f msf.sql
```

Si desde Cuba no hay forma de sacar el dump, hace falta una máquina o un
proxy fuera del bloqueo. Sin dump, la alternativa es volver a sembrar el
catálogo (los scripts de `PRUEBAS_LOCAL.md` sirven de base) y re-subir fotos.

Las **imágenes** no viajan en el dump: los archivos están en el Storage de
Supabase. Opciones, de mejor a peor:

1. Copiar los objetos de Supabase a Nhost (script con las dos APIs).
2. Descargar las imágenes por sus URLs públicas y volver a subirlas desde el
   panel.
3. Dejar las URLs antiguas tal cual: `pathDesdeUrl()` devuelve `undefined`
   para una URL de Supabase, así que la fila se actualiza pero el archivo
   viejo no se borra (no rompe nada; queda huérfano).

## Limitaciones conocidas de esta rama

- **Sin migración automática de Storage**: Nhost asigna el id del archivo, no
  se puede conservar la ruta (`dulces/uuid.png`) como en Supabase. La URL
  cambia, pero queda guardada en `imagen_url`; el resto del sistema no nota la
  diferencia.
- **Borrado de imágenes heredadas**: si una fila conserva una URL de Supabase,
  `ImagenService` no puede borrar el objeto en Nhost. Se registra y se sigue.
- **Un bucket por rol**: en Nhost los buckets se crean a mano (dashboard o SQL
  `INSERT INTO storage.buckets ...`), no los crea la aplicación al vuelo como
  hace Supabase. Por eso está `NHOST_BUCKET` para usar uno solo.
- **CDN**: si el proyecto tiene CDN delante, `NHOST_PUBLIC_URL_BASE` permite
  apuntar las URLs a esa base sin tocar el código.
- **Wasmer**: el código de esta rama no está desplegado. Cuando se decida
  migrar, hay que poner las variables en Wasmer y desplegar; hasta entonces
  producción sigue con Supabase.
