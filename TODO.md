# Todo

Pendientes y cosas que hay que arreglar. Sin deadlines todavía; es una lista de trabajo.

---

## Urgente por bug

### El login devuelve 400 en vez de 401

**Dónde.** `POST /auth/login`, en la ruta de fallo de `src/auth/auth.service.ts`.

**Qué pasa.** Un login con credenciales incorrectas responde `400 Bad Request`. Lo correcto es `401 Unauthorized`, y es lo que dice el resto del código: el guard y el resto de rutas protegidas asumen 401.

Comprobado en Wasmer (simulación local con `npm install --omit=dev`) y también en dev:

```bash
curl -X POST http://127.0.0.1:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"nadie@ejemplo.com","password":"incorrecta123"}'
# -> HTTP 400   (debería ser 401)
```

**Por qué importa.** Cualquier cliente que diferencie "credenciales malas" de petición malformada recibe la señal equivocada. Un 400 normalmente significa que hay que corregir el body; un 401 significa que hay que corregir las credenciales. También rompe los flujos que cuentan reintentos de login, porque un 4xx se puede interpretar como error del cliente y no como fallo de autenticación.

**Cómo arreglarlo.** Revisar qué excepción lanza `AuthService` cuando no encuentra al usuario o cuando el password no cuadra, y cambiar `BadRequestException` por `UnauthorizedException`. Ojo: hay que tocar solo la rama de credenciales incorrectas. Si el body no cumple el DTO (falta el campo, email mal formado), ese 400 sí es correcto y debe seguir siendo 400, porque es un error de petición y no de credenciales.

**Pendiente de confirmar.** No leí el archivo todavía, así que no sé qué excepción lanza exactamente ni en qué línea. Hay que abrirlo antes de cambiar nada.

---

## Deploy

### El arreglo de Wasmer solo esta en `test_deploy`

**Dónde.** `save/derikgm-msf-nestjs.yaml`, commit `69cf549`.

**Qué pasa.** El arreglo para que Wasmer no intente compilar NestJS vive en la rama `test_deploy`. La rama `develop` todavía tiene `node_framework: nestjs` y no declara `build: ""`, así que un deploy desde `develop` vuelve a fallar con el error de herramientas.

**Por qué importa.** Es facil que alguien despliegue desde `develop` por costumbre y se topes otra vez con el mismo error, sin saber de dónde viene.

**Opciones.**

1. Llevar el arreglo a `develop` y desplegar desde ahi. Es lo más simple, pero `develop` tiene 4 commits que no están en `test_deploy` (`prueba preliminar`, `Quitando el build` y los 2 del arreglo), así que hay que decidir qué se queda y qué no.
2. Dejar el arreglo solo en `test_deploy` y dejar claro que el deploy sale de ahi. Funciona, pero es una fuente de confusión.

**Relacionado.** El commit `146fd44 Quitando el build` borro el script `build` de `package.json`. El merge lo restauró. Si alguien hace merge de `test_deploy` hacia `develop` de nuevo, el mismo conflicto reaparece en `package.json`.

---

## Ideas de codigo

### `dist/` esta versionado

**Qué pasa.** Hay 120 archivos compilados y un `.map` de 1.1 MB en el control de versiones. Es lo que permite que Wasmer arranque sin compilar, así que **no es un error: es la decisión que hace funcionar el deploy actual**.

**Si se quiere limpiar.** Sacar `dist/` de git obliga a cambiar el modelo de deploy: Wasmer tendria que poder compilar, lo cual necesita `typescript` en `dependencies` en vez de `devDependencies`, o un paso de build en otro lado. Es un cambio de fondo, no una limpieza cosmetica. Anotado para decidir con calma, no para hacerlo ya.

### El `.gitignore` ignora `tsbuildinfo` pero el archivo se llama `tsconfig.build.tsbuildinfo`

**Qué pasa.** La regla es `tsbuildinfo` sin barra ni asterisco, así que solo ignora un archivo llamado exactamente `tsbuildinfo`. `tsconfig.build.tsbuildinfo` no coincide y por eso se cuela en el repo como archivo no trackeado.

**Arreglo trivial.** Cambiar la regla por `*.tsbuildinfo`.

---

## Backends

### Cuota de Storage y archivos huerfanos

**Qué queda.** Cuando se borró el dulce `Panetela Grande` de la base, su imagen nunca llegó a subirse a Storage (no tenía `imagen_url`), así que no quedaron archivos huérfanos ahí. Pero el patrón sigue siendo un riesgo: si se borra un dulce que sí tenga imagen, el archivo en Supabase Storage se queda ahí ocupando cuota sin que nada lo apunte.

`StorageQuotaService.decrementarUso()` sigue haciendo leer-y-escribir: dos borrados de imagen a la vez pueden pisarse y la cuota queda desviada. `reservarCuota()` sí está protegido con un `UPDATE` condicional. Cuando se toque eso, `decrementarUso()` debería hacer `SET bytes_usados = GREATEST(bytes_usados - n, 0)` en una sola sentencia.

### Migraciones pendientes

La tabla `storage_quota` se crea sola con `synchronize: true`. Cuando eso se desactive hay que generar la migracion de `usuario`, `storage_quota`, las columnas `dulce.imagen_bytes` / `dulce.imagen_url` y las cuatro columnas de entrega de `pedido`.

Las columnas de entrega (`direccion`, `telefono`, `fecha`) son `nullable` solo porque `synchronize: true` no puede anadir una columna NOT NULL a una tabla con filas. Cuando se escriban las migraciones y se vacie la tabla, deben volver a ser NOT NULL y los tipos de `delys.interfaces.ts` pasan de `string | null` a `string`.

### Startup del catalogo

`DelysService.onApplicationBootstrap()` comprueba `count()` y luego inserta. Con dos instancias arrancando a la vez, las dos ven la tabla vacia e insertan el catalogo duplicado. Se arregla con `INSERT ... ON CONFLICT DO NOTHING`.

### Seguridad

- Falta la `SUPABASE_SERVICE_ROLE_KEY` real en `.env`. **Nota:** ya no es un marcador; ahora hay una clave `sb_secret_...` que funciona y sube imagenes a Storage correctamente. La nota de `Decisiones.md` que dice que falta esta pendiente de actualizarse.
- No hay limite de intentos de login (`@nestjs/throttler`) ni log de auditoria. Relevante ahora que se sabe que el login responde 400 en vez de 401.

---

## Entorno

### El token del Codespace no puede pushear a Delys

**Qué pasa.** El frontend tiene 2 commits locales sin subir. El `GITHUB_TOKEN` del Codespace es un token de GitHub App (`ghu_`) con alcance solo sobre el repo desde el que se creó el Codespace, o sea `msf-nestjs`. Por eso el backend sí pushea y Delys no.

**Commits pendientes en `frontends/delys`** (rama `develop_complex`, van 2 adelante):

```
8144e43 quita imagen de Panetela Media, el dulce ya no esta en el catalogo
53eb54c limpieza de imagenes
```

**Vías para subirlos.** Pushear desde la máquina local; crear un Codespace desde el repo de Delys; o agregar una SSH key / PAT con permisos de escritura.

### Recordatorio de deploy del frontend

`npm run deploy` en `frontends/delys` publica en `derikgm.github.io/Delys`. **No correrlo hasta que el usuario lo pida**: estamos probando y el sitio está en uso. Los assets de `develop_complex` referencian `derikgm.github.io` y la carpeta `Delys` en `src/app/comunes/imagenes.ts`, así que cambiar esos valores afecta a producción.