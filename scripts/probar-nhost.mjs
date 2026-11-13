// scripts/probar-nhost.mjs
/**
 * Comprueba, en este orden, las dos cosas que Nhost tiene que darnos:
 *
 *   1. Postgres: conecta con `DATABASE_URL` y lee la tabla `migrations`
 *      (si existe) para ver qué esquema encontró.
 *   2. Storage: sube un PNG de 1×1 al bucket configurado, comprueba que su
 *      URL pública se puede abrir **sin credenciales** y lo borra.
 *
 * Uso (desde `msf-nestjs/`):
 *
 *   node scripts/probar-nhost.mjs
 *
 * Lee `.env` del repo. Variables que usa:
 *
 *   DATABASE_URL          cadena de Postgres de Nhost (con acceso público).
 *   DB_SSL                `false` para un Postgres local; si falta, TLS sin CA.
 *   NHOST_STORAGE_URL     base de Storage, terminada en `/v1`.
 *   NHOST_ADMIN_SECRET    secreto de administración del proyecto.
 *   NHOST_BUCKET          bucket a probar (por defecto `default`).
 *
 * No escribe nada en la base: la prueba de Storage borra el archivo que sube.
 * Si algo falla, explica qué revisar en el dashboard de Nhost.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

/** PNG transparente de 1×1: lo más pequeño que pasa por una subida real. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const entorno = cargarEnv();
const fallos = [];

function cargarEnv() {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
  } catch {
    try {
      // Node sin `process.loadEnvFile`: lectura mínima del `.env` del repo.
      const texto = readFileSync(new URL('../.env', import.meta.url), 'utf8');

      for (const linea of texto.split('\n')) {
        const coincidencia = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

        if (!coincidencia) continue;

        const [, clave, valor] = coincidencia;
        if (process.env[clave] === undefined) process.env[clave] = valor.replace(/^["']|["']$/g, '');
      }
    } catch {
      // Sin `.env`: se usan solo las variables que vengan por entorno.
    }
  }

  return process.env;
}

function ok(mensaje) {
  console.log(`  ✔ ${mensaje}`);
}

function fallo(mensaje, ayuda) {
  fallos.push(mensaje);
  console.log(`  ✘ ${mensaje}`);
  if (ayuda) console.log(`    → ${ayuda}`);
}

function recortar(valor) {
  return (valor ?? '').trim();
}

async function probarBaseDeDatos() {
  console.log('\n1) Postgres');

  const url = recortar(entorno.DATABASE_URL);

  if (!url) {
    fallo(
      'Falta DATABASE_URL',
      'Cópiala de Nhost → Database → Settings. Recuerda habilitar el acceso público.',
    );
    return;
  }

  const cliente = new pg.Client({
    connectionString: url,
    ssl: recortar(entorno.DB_SSL) === 'false' ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000,
  });

  try {
    await cliente.connect();

    const { rows } = await cliente.query(
      "select current_database() as base, current_user as usuario, version() as version",
    );

    ok(`conectado a ${rows[0].base} como ${rows[0].usuario}`);
    console.log(`    ${rows[0].version.split(',')[0]}`);

    try {
      const migraciones = await cliente.query(
        'select name from migrations order by id desc limit 8',
      );

      if (!migraciones.rowCount) {
        console.log('    (la tabla migrations está vacía: el servidor la llenará al arrancar)');
      } else {
        console.log('    Últimas migraciones aplicadas:');

        for (const fila of migraciones.rows) console.log(`      - ${fila.name}`);
      }
    } catch {
      console.log('    (todavía no existe la tabla migrations: normal en una base nueva)');
    }
  } catch (error) {
    fallo(
      `no se pudo conectar: ${error.message}`,
      'Revisa DATABASE_URL y que Nhost → Database → Settings → Access tenga el acceso público activo.',
    );
  } finally {
    await cliente.end().catch(() => {});
  }
}

async function probarStorage() {
  console.log('\n2) Storage');

  const base = (
    recortar(entorno.NHOST_STORAGE_URL) ||
    (recortar(entorno.NHOST_SUBDOMAIN) && recortar(entorno.NHOST_REGION)
      ? `https://${recortar(entorno.NHOST_SUBDOMAIN)}.storage.${recortar(entorno.NHOST_REGION)}.nhost.run/v1`
      : '')
  ).replace(/\/+$/, '');
  const secreto = recortar(
    entorno.NHOST_ADMIN_SECRET || entorno.HASURA_GRAPHQL_ADMIN_SECRET,
  );
  const bucket = recortar(entorno.NHOST_BUCKET) || 'default';

  if (!base) {
    fallo(
      'Falta NHOST_STORAGE_URL',
      'Es la base de Storage terminada en /v1. También puedes definir NHOST_SUBDOMAIN y NHOST_REGION.',
    );
    return;
  }

  if (!secreto) {
    fallo(
      'Falta NHOST_ADMIN_SECRET',
      'Está en Nhost → Settings → Secrets: HASURA_GRAPHQL_ADMIN_SECRET.',
    );
    return;
  }

  if (!/\/v1$/.test(base)) {
    console.log(
      '    Aviso: NHOST_STORAGE_URL no termina en /v1. Se usa tal cual; si las rutas dan 404, añádelo.',
    );
  }

  const formulario = new FormData();
  formulario.append('bucket-id', bucket);
  formulario.append('file[]', new Blob([PNG_1X1], { type: 'image/png' }), 'prueba-nhost.png');

  let id;

  try {
    const respuesta = await fetch(`${base}/files`, {
      method: 'POST',
      headers: { 'X-Hasura-Admin-Secret': secreto },
      body: formulario,
      signal: AbortSignal.timeout(30_000),
    });

    const texto = await respuesta.text();
    let cuerpo = null;

    try {
      cuerpo = JSON.parse(texto);
    } catch {
      // Respuesta no JSON: se muestra el texto tal cual abajo.
    }

    if (!respuesta.ok) {
      fallo(
        `la subida respondió ${respuesta.status}: ${cuerpo?.error?.message ?? texto.slice(0, 300)}`,
        `Revisa que el bucket «${bucket}» exista (Nhost → Storage) y que el secreto sea el admin secret.`,
      );
      return;
    }

    id = cuerpo?.processedFiles?.[0]?.id;

    if (!id) {
      fallo(
        'la subida no devolvió processedFiles[0].id',
        `Respuesta: ${texto.slice(0, 300)}`,
      );
      return;
    }

    ok(`subida correcta al bucket «${bucket}» (id ${id})`);
  } catch (error) {
    fallo(
      `no se pudo subir: ${error.message}`,
      'Comprueba la URL de Storage y la conectividad desde esta máquina.',
    );
    return;
  }

  const urlPublica = `${base}/files/${encodeURIComponent(id)}`;

  try {
    const publica = await fetch(urlPublica, { signal: AbortSignal.timeout(20_000) });

    if (publica.ok) {
      ok(`la URL pública abre sin credenciales: ${urlPublica}`);
    } else {
      fallo(
        `la URL pública respondió ${publica.status}`,
        'Para que las vitrinas muestren las fotos, el rol `public` necesita permiso de SELECT en storage.files (Nhost → Storage → Permissions).',
      );
    }
  } catch (error) {
    fallo(`no se pudo abrir la URL pública: ${error.message}`);
  }

  try {
    const borrado = await fetch(`${base}/files/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Hasura-Admin-Secret': secreto },
      signal: AbortSignal.timeout(20_000),
    });

    if (borrado.ok || borrado.status === 404) {
      ok('el archivo de prueba se borró');
    } else {
      fallo(`el borrado respondió ${borrado.status}`);
    }
  } catch (error) {
    fallo(`no se pudo borrar el archivo de prueba (id ${id}): ${error.message}`);
  }
}

console.log('Prueba de conexión con Nhost (Postgres + Storage)');
await probarBaseDeDatos();
await probarStorage();

console.log('');

if (fallos.length) {
  console.log(`Resultado: ${fallos.length} comprobación(es) fallaron.`);
  process.exitCode = 1;
} else {
  console.log('Resultado: todo listo para usar Nhost.');
}
