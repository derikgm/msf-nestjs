# Todo

Pendientes y cosas que hay que arreglar. Sin deadlines todavía; es una lista de trabajo.

Última revisión: se agregaron las tres rutas de gestión del catálogo (`POST`/`PATCH`/`DELETE /delys/dulces`). El resto está como estaba, cotejado commit por commit contra `src/` y `frontends/delys`.

---

## SECCIONES DEL CATÁLOGO (feature en curso)

**Objetivo.** "Agrega a la tabla de producto una columna 'seccion' + crea secciones (FK desde producto)" y "los dulces pasan a la sección 'dulces' (ADC ya no devuelve eso); al devolver los productos de adc, devolver también sus secciones exceptuando 'dulce'". Resumen: navegación por secciones, dulces cobijados en una sección especial `dulces`, y ADC responde sus productos + secciones sin la `dulces`.

**Estado (Oct 2026, environment local levantado):** implementado en `src/`, recompilado a `dist/`, **probado contra la BD local (Docker, `msf-postgres`)** y documentado. **No está commiteado todavía** (pendiente de `git add -A && git commit -m "secciones del catalogo..." && git push origin develop`).

### Qué se implementó y dónde

1. **Entidad `Seccion`** — `src/common/entities/seccion.entity.ts`. Tabla `seccion`: `id` PK, `nombre varchar(60)`, `negocio varchar(16) default 'delys'`, `creado_en`, `UNIQUE(negocio, nombre)`. Exportada en `src/common/entities/index.ts` y metida en el array `entities` (así `TypeOrmModule.forFeature(entities)` de `AdcModule`/`DelysModule` la provee sin tocar los módulos).
2. **FK en `Producto`** — `src/common/entities/dulce.entity.ts`. Columnas `seccion_id int null` (declarada explícita, `@Column`) + `@ManyToOne(() => Seccion)` con `@JoinColumn({ name: 'seccion_id' })`. La interfaz `Dulce` (`src/common/interfaces/catalogo.interfaces.ts`) ganó `seccion_id: number | null`; la semilla `src/common/data/ofertas.ts` ahora manda `seccion_id: null`.
3. **Migración de arranque** — `CatalogoService` (`src/common/services/catalogo.service.ts`):
   - `onApplicationBootstrap()` ahora corre `asignarSeccionDulces()` **siempre** (antes el "alto si ya hay productos" devolvía antes de migrar: BUG que se cazó y se arregló). Los productos con `seccion IS NULL` pasan a la sección `dulces` de **su negocio** (la crea si hace falta, `seccionDulces()`).
   - `crearDulce()`: si llega `seccion_id` busca la sección **dentro del mismo negocio** (`404` si no existe, aunque exista en otro); sin él, `dulces`. Corre dentro de la transacción (usa `manager`).
   - `actualizarDulce()` acepta `seccion_id` y mueve el producto; también valida negocio. El "nada que actualizar" ahora incluye `seccion_id`.
   - `listarSecciones()` (orden por `id`) y `crearSeccion(nombre)` (la guarda en **minúsculas**; duplicado → `409`).
   - `obtenerTodosDulces()` con `relations: { seccion: true }` (para filtrar por nombre de sección arriba).
4. **DTOs** — `src/common/dto/create-seccion.dto.ts` (nuevo, `nombre` obligatorio, ≤60) y `seccion_id?` (`@Type(() => Number) @IsInt @IsPositive @IsOptional`) en `create-dulce.dto.ts` y `update-dulce.dto.ts`.
5. **Rutas** — en `src/delys/delys.controller.ts` y `src/adc/adc.controller.ts`:
   - `GET /delys/secciones` (público, **sí** trae `dulces`), `POST /delys/secciones` (`@Roles('delys')`).
   - `GET /adc/secciones` (público, **sin** `dulces`), `POST /adc/secciones` (`@Roles('adc')`).
   - `GET /adc/productos` → `{ productos: [...con seccion_id y seccion nombre], secciones: [{id, nombre}] }`, y **filtra** los productos de la sección `dulces` y la propia sección `dulces`.
   - `POST/PATCH /adc/productos` / `POST/PATCH /delys/dulces` con `seccion_id` (traducen por negocio).
6. **Migración SQL para producción** — `migraciones/003-secciones.sql` (idempotente, a prueba de orden): crea `seccion`, añade `producto.seccion_id` con FK (solo si `producto` no tiene ya una, por si `synchronize` la creó antes) y el backfill de los productos sin sección a `dulces`.
7. **Docs** — `API.md` (tabla + sección 20 "Secciones del catálogo"), `README.md` (tabla de rutas).

### Verificado contra el local (en orden)

- Arranque → `seccion` creada, `producto.seccion_id` presente, `Log` "asignados a la sección dulces" por negocio.
- `SELECT ... FROM producto LEFT JOIN seccion ...`: delys 1-4 → delys/dulces; adc 5-6 → adc/dulces.
- `GET /delys/dulces`: cada dulce con `seccion_id` y objeto `seccion`.
- `POST /delys/secciones {nombre}` crea (normaliza a minúsculas); repetido → `409`.
- `GET /adc/productos`: vacío mientras todo esté en `dulces`; crear sección `Electrónico` + producto con `seccion_id` → aparece con `seccion: "electronico"`; producto sin `seccion_id` → cae a `dulces` y queda oculto; `seccion_id` de otro negocio → `404`.
- Datos de prueba generados se limpiaron (productos 7-8 y sección `especial` borrados; quedan secciones 2 delys/dulces, 3 adc/dulces, 4 adc/electronico).

### Lo que sigue

- [ ] **Commitear y pushear**: `git add -A && git commit -m "secciones del catalogo: entidad, FK, rutas y migracion" && git push origin develop`. `dist/` está versionado y ya está recompilado (`npm run build` pasa limpio).
- [ ] (opcional) Frontend ADC: consumir `secciones` y `seccion_id`, y el `POST /adc/secciones` desde su panel.
- [x] (ver "Migraciones pendientes" abajo) cuando se desactive `synchronize`: generar la migración formal de TypeORM para `seccion`/`seccion_id`. **Hecho (2026-10-07):** `synchronize` está en `false` y la línea base `src/migraciones/1791390744944-Inicial.ts` ya incluye `seccion` y la clave foránea `producto.seccion_id`.
- [ ] Recordar que `pkill -f "node server.js"` se mata a sí mismo (el patrón coincide con el comando): usar `pgrep -f "[n]ode server.js"` o `kill <pid>`.

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

**Resuelto (2026-10-07).** `synchronize` está ya en `false` y la línea base
`src/migraciones/1791390744944-Inicial.ts` deja escrito el esquema completo de entonces:
`usuario`, `storage_quota`, `producto` (con `imagen_bytes` / `imagen_url`) y las cuatro columnas
de entrega de `pedido`. En las bases creadas antes no hace nada (se salta); en una base nueva lo
crea entero. Cómo se escribe una migración nueva: README, sección «Cambiar el esquema de la base
de datos».

Las columnas de entrega (`direccion`, `telefono`, `fecha`) son `nullable` solo porque con
`synchronize: true` no se podía añadir una columna NOT NULL a una tabla con filas. Ahora que el
esquema se toca con migraciones, **sigue pendiente** vaciar la tabla y devolverlas a NOT NULL, y
pasar los tipos de `delys.interfaces.ts` de `string | null` a `string`.

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

