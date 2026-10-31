# Pruebas locales del sistema MSF

Guía para correr **backend + panel + vitrinas** en una máquina, con Postgres
propio y datos de prueba que incluyen subcategorías. Pensada para sobrevivir a
cortes de luz: todo es reproducible y los scripts de siembra y pruebas son
idempotentes.

## Las cuatro piezas

| Carpeta | Qué es | Corre en |
| --- | --- | --- |
| `msf-nestjs` | API NestJS + Postgres (el corazón del sistema) | `:3000` |
| `msf-app` | Panel de administración (React 19 + Vite + Tauri) | `:1420` |
| `adc` | Vitrina de ADC, material eléctrico (Angular 22) | `:4200` |
| `Delys` | Vitrina de la pastelería (Angular 22) | `:4200` (otro `ng serve`) |

El panel elige qué negocio mostrar según el **rol del token**, así que con una
sola instancia de `msf-app` se prueba ADC, Delys, Domus y la administración.

## El Postgres de desarrollo

`16-main` del sistema escucha en `:5432`, pero la contraseña del rol `postgres`
no está en el repo, y el clúster compartido no es un sitio donde experimentar
con siembras. Por eso el desarrollo local usa **un clúster propio** en `:5433`:

```sh
BASE=$HOME/.local/share/msf-pg-dev          # el disco de datos
mkdir -p "$BASE/run"
/usr/lib/postgresql/16/bin/initdb -D "$BASE/data" -U postgres --auth=trust -E UTF8
/usr/lib/postgresql/16/bin/pg_ctl -D "$BASE/data" -l "$BASE/pg.log" \
  -o "-p 5433 -c listen_addresses=127.0.0.1 -c unix_socket_directories=$BASE/run" start
psql -h "$BASE/run" -p 5433 -U postgres -c 'CREATE DATABASE msf;'
```

Y en `msf-nestjs/.env`:

```
DATABASE_URL=postgres://postgres@localhost:5433/msf
DB_SSL=false
```

**Por qué fuera de `/mnt/Datos`:** ese volumen está montado como `fuseblk` (NTFS)
y todos sus archivos quedan propiedad de `root`; Postgres se niega a arrancar con
un directorio de datos que no es del usuario que lo levanta («data directory has
wrong ownership»). El clúster tiene que vivir en una partición real (`ext4`), de
ahí `$HOME/.local/share`.

`--auth=trust` solo es aceptable porque el clúster escucha en `127.0.0.1` y es de
prueba: no lo uses para una base con datos reales.

## Arranque completo

Desde `msf-nestjs/` (el `.env` ya apunta al clúster de arriba):

```sh
npm run build          # tsc -p tsconfig.build.json
npm run dev            # compila y arranca server.js en :3000
node scripts/semilla-local.mjs           # usuarios + árbol de secciones + combos
node scripts/pruebas-subcategorias.mjs   # batería de reglas de subcategorías
```

El esquema no se adivina en cada arranque: `synchronize: false` y `migrationsRun: true`, así
que el primer arranque aplica las cuatro migraciones (`Inicial`,
`InstalacionesYCombos`, `DescripcionProducto`, `Subcategorias`) y deja las tablas
 listas. `GET /ping` responde `{"ok":true}` cuando ya está arriba.

Panel y vitrinas, cada uno en su repo:

```sh
cd ../msf-app && npm run dev     # http://localhost:1420  (VITE_API_URL=localhost:3000)
cd ../adc    && npx ng serve     # http://localhost:4200  (environment.apiUrl=localhost:3000)
```

`Delys` no necesita configuración: su `esModoDesarrollo()` decide la API por el
hostname, y en `localhost` toma `http://localhost:3000/delys`.

## Usuarios de prueba

Los crea `scripts/semilla-local.mjs`, todos con la contraseña `prueba1234`
(cambiable con `SEMILLA_PASS`):

| Usuario | Rol | Qué abre en el panel |
| --- | --- | --- |
| `delys` | delys | dulces, combos, pedidos |
| `adc` | adc | productos, secciones, instalaciones |
| `admin` | admin | gestión de usuarios y los cuatro paneles |

El rol `admin` se escribe por SQL desde el script: el registro público lo
rechaza a propósito (N-2), y sin token de admin no hay forma de darle de alta
por API. Es exactamente el caso que describes el mensaje de `POST /auth/admin/usuarios`.

## Datos sembrados

* **ADC** — `electronico` → (`neveras`, `ventiladores`), `iluminacion` →
  (`focus led`, `guirnaldas`), `instalaciones` → (`paneles solares`,
  `baterias ecoflow`). Siete productos repartidos por esas subcategorías y un
  breaker **sin sección**, que el servidor mete solo en la sección reservada
  `dulces` de ADC (así se comprueba el caso raro).
* **Delys** — `tortas` y `galletas` creadas por API; las subcategorías
  `tortas de cumpleaños` y `de sobre` se insertan por SQL (ver brecha abajo), dos
  dulces colgando de ellas, un combo con un dulce escrito a mano que no está en
  el catálogo y un pedido para dentro de tres días.
* Cuotas de `storage` en 20 MB por rol.

## Qué está probado

* `npm run test` (vitest, sin base de datos viva): **10 pruebas** en
  `test/contrato.spec.ts` y `test/entidades.spec.ts`.
* `node scripts/pruebas-subcategorias.mjs`: **32 comprobaciones** sobre el
  servidor real, con limpieza al final. Cubren normalización a minúsculas, un
  solo nivel (subcategoría de subcategoría → `400`), padre inexistente → `404`,
  padre de **otro negocio** → `404`, nombre reservado `dulces` → `400`,
  duplicado → `409`, sin token → `401`, token de otro rol → `403`,
  auto-padre → `400`, principal con hijas no baja → `400`, `PATCH` vacío → `400`,
  `padre_id: null` vuelve a principal, renombrado, borrado protegido (`409` con
  subcategorías dentro, `409` con productos dentro, `200` vacía) y que la
  vitrina nombre la sección de cada producto.

## Brecha conocida: Delys y las subcategorías

La subcategoría como concepto de producto está hecha **para ADC**, no para la
pastelería:

* `POST /delys/secciones` **ignora `padre_id`** y siempre crea una categoría
  principal (`DelysController.crearSeccion()`). ADC sí lo acepta.
* Delys no tiene `PATCH` ni `DELETE` de secciones; ADC sí.
* `GET /delys/secciones` **sí** devuelve `padre_id`, así que la lectura del árbol
  funciona — pero ni `msf-app/SeccionDulces` ni la web de Delys pintan la
  jerarquía. La web de ADC tampoco la recorre todavía (`adc/src` no usa
  `padre_id`); el árbol jerárquico hoy solo se ve en el panel
  (`msf-app/src/componentes/adc/SeccionProductos.tsx` y `SeccionSecciones.tsx`).

Por eso el sembrado mete las subcategorías de Delys por SQL: para dejar visible
el estado de la base, no porque el endpoint lo permita.

## Limitaciones del entorno local

* **Imágenes**: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del `.env` local son
  de ejemplo. Las rutas `*/imagen` fallan (subida, borrado, cuota real); el resto
  del catálogo funciona sin ellas, con `imagen_url` en `null`.
* **Node**: si `npm`/`npx` fallan con `snap-confine ... cap_dac_override`, el
  binario interno sí funciona: `/snap/node/<versión>/bin/node`. Con ese se pueden
  lanzar `node_modules/typescript/bin/tsc`, `node_modules/vitest/vitest.mjs`,
  `node_modules/vite/bin/vite.js` y `node_modules/@angular/cli/bin/ng.js` sin
  pasar por `npm`.
* **SWC**: si vitest falla con `ERR_SWC_NATIVE_CACHE`, apunta su caché a un
  directorio 700 propio (`~/.cache` heredado es 775 y SWC rechaza cachés cuyo
  padre es escribible por otro):

  ```sh
  mkdir -p ~/.local/share/msf-swc-cache && chmod 700 ~/.local/share/msf-swc-cache
  SWC_NATIVE_BINDING_CACHE=~/.local/share/msf-swc-cache npm run test
  ```

* **CORS**: `server.js` tiene en lista blanca `localhost:1420` (panel), `:4200`,
  `:9998`, `:9999`, `:4300` y `derikgm.github.io`. Si arrancas una vitrina en
  otro puerto, añádelo allí o el navegador bloqueará las llamadas aunque la API
  responda.
