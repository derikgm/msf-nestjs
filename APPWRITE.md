# Storage en Appwrite (rama `feature/appwrite`)

Este documento describe cómo la app usa **Appwrite Storage** como proveedor de
imágenes, y cómo probarlo. Es el equivalente de `NHOST.md` para la rama
`feature/nhost`.

Supabase sigue siendo el proveedor por defecto (`STORAGE_PROVIDER=supabase`).
En la rama `feature/appwrite` se prueba Appwrite con
`STORAGE_PROVIDER=appwrite`.

## Configuración

Variables en el `.env` (ver también `.env.example`):

| Variable | Para qué sirve |
| --- | --- |
| `STORAGE_PROVIDER` | Elige el backend: `supabase` (default), `nhost` o `appwrite`. |
| `APPWRITE_ENDPOINT` | Base de la API de Appwrite, terminada en `/v1`. Para el proyecto de Appwrite Cloud en la región **nyc**: `https://nyc.cloud.appwrite.io/v1` (con `https://cloud.appwrite.io/v1` daba error: *Project is not accessible in this region*). |
| `APPWRITE_PROJECT_ID` | ID del proyecto de Appwrite (Project → General → Project ID). |
| `APPWRITE_API_KEY` | API key del backend (Project → API keys; scope: `files.*`). Es un secreto: no va al repo ni al frontend. |
| `APPWRITE_BUCKET` | Bucket único para todos los roles (opcional). Si falta se usan `delys`, `adc` y `domus`, que deben existir en Appwrite. |
| `APPWRITE_PUBLIC_URL_BASE` | Base pública distinta para las URLs de las fotos (opcional, CDN propio). |

## Cómo funciona el adaptador

`src/common/services/appwrite-storage.service.ts` implementa el mismo
contrato que `SupabaseService` y `NhostStorageService`
(`subir` / `eliminar` / `getPublicUrl` / `pathDesdeUrl`), así que
`ImagenService` no cambia.

- **Subir**: `POST {APPWRITE_ENDPOINT}/storage/buckets/{bucketId}/files`, body
  `multipart/form-data` con `fileId`, `file`, `permissions[]` y (opcional)
  `folder`. La respuesta `201` devuelve el archivo con `$id`.
- **Borrar**: `DELETE {APPWRITE_ENDPOINT}/storage/buckets/{bucketId}/files/{fileId}`.
- **URL pública**: `{APPWRITE_PUBLIC_URL_BASE}/storage/buckets/{bucketId}/files/{fileId}/download?project={projectId}`.

Notas del protocolo probado contra Appwrite Cloud (v2.7.1):

- El endpoint correcto para subir es
  `POST /v1/storage/buckets/{bucketId}/files` (multipart), no `/v1/files`.
- Los permisos se envían como array de strings en el campo multipart
  `permissions[]` (p. ej. `read("any")`).
- El bucket debe existir (o crearse) y debe tener permisos de lectura
  públicos. En la API se creó con
  `PUT /v1/storage/buckets/{bucketId}` y
  `{"name":"<id>","permissions":["read(\"any\")"]}`. Con permisos a nivel de
  archivo hace falta habilitar *File security* en el bucket; con permisos a
  nivel de bucket alcanza.
- El plan gratuito bloquea las **transformaciones de imagen**: el endpoint
  `/preview` responde `403 storage_image_transformations_blocked`. Para servir
  la imagen a las vitrinas usar el endpoint `/download`.
- El proyecto y la key deben apuntar a la misma región: el endpoint
  `https://cloud.appwrite.io/v1` rechazaba el proyecto de la región nyc
  (*Project is not accessible in this region*).

## Prueba de conexión

```bash
node scripts/probar-appwrite.mjs
```

Comprueba: API configurada, subida de un PNG de 1×1 al bucket, apertura de la
URL pública sin credenciales y borrado.

## Flujo de migración de imágenes (equivalente al de Nhost)

1. Subir los archivos del backup a Appwrite (mismo zip de Supabase Storage).
2. Actualizar `imagen_url` en las filas con `imagen_url` (URLs de
   `https://<proyecto>.supabase.co/storage/v1/object/public/...`).
3. Verificar con el server corriendo en `STORAGE_PROVIDER=appwrite`.
