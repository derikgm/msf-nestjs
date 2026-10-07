# Todo

Pendientes y cosas que hay que arreglar. Sin deadlines todavía; es una lista de trabajo.

Última revisión: se agregaron las tres rutas de gestión del catálogo (`POST`/`PATCH`/`DELETE /delys/dulces`). El resto está como estaba, cotejado commit por commit contra `src/` y `frontends/delys`.

---

## Urgente por bug

### ~~Los pedidos no se pueden enviar: `POST /delys/pedido` respondía 401~~ RESUELTO

**Dónde.** `src/delys/delys.controller.ts` → `agregarPedido()`.

**Qué pasaba.** La ruta tenía `@Roles('delys')` y el sitio de Delys manda el pedido sin token (el cliente de la pastelería no tiene cuenta). El `JwtAuthGuard` respondía `401 "Falta el token"`, así que el flujo de compra estaba roto de punta a punta. El catálogo y las imágenes nunca estuvieron afectados: se confundía porque el error salía justo después de cargar los datos con las URLs.

**Arreglo.** `@Public()` en vez de `@Roles('delys')`. Ver y borrar pedidos (`GET`/`DELETE /delys/pedidos`) siguen exigiendo rol `delys`: esas son las del panel.

**Comprobado** contra la base de datos real, sin token: `201 Created`, pedido guardado, `precio_total` 7500 (2 × 1000 + 1 × 5500). Y los 401 de las rutas de panel siguen en pie. `API.md` y `README.md` actualizados.

**Lo que queda de este punto.** La ruta quedó abierta a cualquiera, sin límite. Falta `@nestjs/throttler` (ver Seguridad) antes de considerarla cerrada de verdad.

**Nota de deploy.** `dist/` está versionado, así que el cambio solo llega a Wasmer si se commitea el `dist/` recompilado. Ya está recompilado con `npm run build`.

---

### `imagen_bytes`: el backend manda un número y el frontend espera una imagen en base64

**Dónde.** `frontends/delys/src/app/comunes/imagenes.ts` (`resolverImagenDulce()`) contra el tipo `imagen_bytes` de `frontends/delys/src/app/modelos/dulces.modelo.ts`.

**Qué pasa.** El mismo nombre significa dos cosas distintas:

| Lado | Tipo | Significado |
| --- | --- | --- |
| Backend (`src/delys/entities/dulce.entity.ts`) | `number` | Tamaño del archivo, para liberar cuota al borrar |
| Frontend (`dulces.modelo.ts`) | `string \| null` | La imagen entera en base64 |

`resolverImagenDulce()` hace `dulce.imagen_bytes?.trim()`. Con un número ahí, `?.` no salva: solo protege `null`/`undefined`, y `(12345).trim` no existe, así que reventaría con `TypeError`.

**Estado real: hoy no salta.** En producción los tres dulces tienen `imagen_bytes: null` (las imágenes se subaaron a Storage sin registrar el tamaño), así que la rama ni se ejecuta y no se ve el crash. Queda como bomba de tiempo: en cuanto un dulce tenga `imagen_bytes` con valor, la página de productos deja de renderizar.

**Cómo arreglarlo.** Lo correcto es no enviar el campo: es interno del backend (existe para la cuota) y la interfaz `Dulce` de `delys.interfaces.ts` ya lo omite a propósito. Sacar `imagen_bytes` de la respuesta de `GET /delys/dulces` y dejar el modelo del frontend en `imagen_url` + assets locales. Si se quiere conservar el base64 como respaldo, hay que decidir antes quién lo escribe, porque hoy nadie.

**De paso.** Las imágenes de producción devuelven `content-type: application/octet-stream` en vez de `image/jpeg`. Los navegadores las dibujan igual (sniffing), pero conviene subir el bucket con la metadata de tipo correcta.

---

## Decisiones tomadas (no son bugs, pero conviene no olvidarlas)

### `dist/` esta versionado

**Qué pasa.** Hay 120 archivos compilados y un `.map` de 1.1 MB en el control de versiones. Es lo que permite que Wasmer arranque sin compilar, así que **no es un error: es la decisión que hace funcionar el deploy actual**.

**Si se quiere limpiar.** Sacar `dist/` de git obliga a cambiar el modelo de deploy: Wasmer tendria que poder compilar, lo cual necesita `typescript` en `dependencies` en vez de `devDependencies`, o un paso de build en otro lado. Es un cambio de fondo, no una limpieza cosmetica. Anotado para decidir con calma, no para hacerlo ya.

### El arreglo de Wasmer ya esta en `develop`

Estaba en `test_deploy` y generaba Confusion ("si desplego desde `develop` falla"). **Resuelto**: el commit `1c50570` ya esta en `develop`, y el diff entre las dos ramas es de un unico archivo:

```
dist/delys/delys.service.js.map   (borrado en test_deploy)
```

Los dos ultimos commits de cada rama son los mismos con otro hash (`69cf549`/`1c50570` y `60b719f`/`0a13f9d`). Se puede desplegar desde `develop` con normalidad. Cuando toque, `test_deploy` se puede borrar.

---

## Ideas de codigo

### ~~El `.gitignore` ignora `tsbuildinfo` pero el archivo se llama `tsconfig.build.tsbuildinfo`~~ RESUELTO

**Arreglo.** La regla ahora es `*.tsbuildinfo`, así que cubre los dos nombres (`dist/tsbuildinfo` de `tsconfig.build.json` y `dist/tsconfig.tsbuildinfo` del tsconfig raíz, que es el que usa el editor y pesa 272 KB).

**Nota.** `dist/tsconfig.tsbuildinfo` sí estaba appearing como untracked en `git status`; con la regla nueva ya no aparece. No hizo falta `git rm --cached` porque nunca llegó a estar trackeado.

---

## Backends

### Cuota de Storage y archivos huerfanos

**Qué queda.** Cuando se borró el dulce `Panetela Grande` de la base, su imagen nunca llegó a subirse a Storage (no tenía `imagen_url`), así que no quedaron archivos huérfanos ahí. Ese caso ya no puede volver a pasar por la vía normal: `DELETE /delys/dulces/:id` (ver "Gestión del catálogo desde el panel") libera la imagen antes de borrar la fila, con `DulceImagenService.liberarParaBorrar()`. Lo que **sí** queda es que esa liberación se traga el error si Storage falla: el dulce desaparece del catálogo y el archivo se queda ahí ocupando cuota, sin nada que lo apunte. Queda logged como `warn` y hay que limpiarlo a mano.

`StorageQuotaService.decrementarUso()` sigue haciendo leer-y-escribir: dos borrados de imagen a la vez pueden pisarse y la cuota queda desviada. `reservarCuota()` sí está protegido con un `UPDATE` condicional. Cuando se toque eso, `decrementarUso()` debería hacer `SET bytes_usados = GREATEST(bytes_usados - n, 0)` en una sola sentencia.

### La gestion del catalogo se hacia por SQL

**Resuelto.** El catálogo solo se podía leer; crearlo, renombrarlo, reprecificarlo o borrarlo era SQL directo (`Decisiones.md`, punto 1.1). Ahora hay tres rutas de panel detrás de `@Roles('delys')`: `POST /delys/dulces`, `PATCH /delys/dulces/:id` y `DELETE /delys/dulces/:id`. El id lo asigna el servidor, así que el cliente no puede pisar un dulce existente ni inventarse ids.

**Lo que sigue igual a propósito.** `POST /delys/pedido` sigue sin tocar el catálogo: sigue recibiendo solo el id del dulce y el total lo calcula el servidor con los precios de la tabla. Que el panel pueda escribir el catálogo no significa que lo pueda hacer un pedido de cualquiera.

### Migraciones pendientes

La tabla `storage_quota` se crea sola con `synchronize: true`. Cuando eso se desactive hay que generar la migracion de `usuario`, `storage_quota`, las columnas `dulce.imagen_bytes` / `dulce.imagen_url` y las cuatro columnas de entrega de `pedido`.

Las columnas de entrega (`direccion`, `telefono`, `fecha`) son `nullable` solo porque `synchronize: true` no puede anadir una columna NOT NULL a una tabla con filas. Cuando se escriban las migraciones y se vacie la tabla, deben volver a ser NOT NULL y los tipos de `delys.interfaces.ts` pasan de `string | null` a `string`.

### Startup del catalogo

`CatalogoService.onApplicationBootstrap()` (antes `DelysService`) comprueba `count()` y luego inserta. Con dos instancias arrancando a la vez, las dos ven la tabla vacia e insertan el catalogo duplicado. Se arregla con `INSERT ... ON CONFLICT DO NOTHING`.

### Seguridad

- La `SUPABASE_SERVICE_ROLE_KEY` de `.env` **ya es real** (empieza con `sb_secret_`) y sube imagenes a Storage correctamente. La nota de `Decisiones.md` que dice que falta esta pendiente de actualizarse.
- No hay limite de intentos de login (`@nestjs/throttler`) ni log de auditoria.
- `POST /delys/pedido` quedó **pública** al arreglar el 401 del frontend. Ahora cualquiera puede mandar pedidos, sin límite. Es lo que corresponde al flujo real (el cliente no tiene cuenta), pero necesita throttler antes de darse por buena: un tope por IP y/o por `telefono`. La instalación de `@nestjs/throttler` hay que hacerla a mano, no está en `package.json`.

---

## Entorno

### El token del Codespace no puede pushear a Delys

**Qué pasa.** El frontend tiene 2 commits locales sin subir. El `GITHUB_TOKEN` del Codespace es un token de GitHub App (`ghu_`) con alcance solo sobre el repo desde el que se creó el Codespace, o sea `msf-nestjs`. Por eso el backend sí pushea y Delys no.

**Commits pendientes en `frontends/delys`** (rama `develop_complex`, van 2 adelante):

```
8144e43 quita imagen de Panetela Media, el dulce ya no esta en el catalogo
53eb54c limpieza de imagenes
```

**Vías para subirlos.** Pushear desde la máquina local; crear un Codespace desde el repo de Delys; o agregar un SSH key / PAT con permisos de escritura.

### Recordatorio de deploy del frontend

`npm run deploy` en `frontends/delys` publica en `derikgm.github.io/Delys`. **No correrlo hasta que el usuario lo pida**: estamos probando y el sitio está en uso. Los assets de `develop_complex` referencian `derikgm.github.io` y la carpeta `Delys` en `src/app/comunes/imagenes.ts`, así que cambiar esos valores afecta a producción.

La rama `gh-pages` está al día con `develop_complex` (no tiene commits que esta no tenga), o sea que lo publicado corresponde a los 2 commits sin subir.

### `api.ts` apunta a producción siempre (a propósito)

`frontends/delys/src/app/datos/api.ts` está **sin commitear** en `develop_complex` con las dos ramas de la ternaria en `API_PRODUCCION`, para probar contra el backend de Wasmer en vez del local. **No es un bug: es intencional.** Lo único a tener en cuenta es que no se debe commitear por descuido, porque `API_DESARROLLO` (`http://localhost:3000/delys`) quedaría sin usarse para siempre.

