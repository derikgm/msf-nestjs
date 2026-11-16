// scripts/probar-appwrite.mjs
/**
 * Comprueba, en este orden, las cosas que Appwrite tiene que darnos para el
 * almacenamiento de imágenes:
 *
 *   1. La API de Appwrite: clave (`APPWRITE_API_KEY`) y proyecto (`APPWRITE_PROJECT_ID`)
 *      configurados en `.env`.
 *   2. Storage: sube un PNG de 1×1 al bucket configurado, comprueba que su URL
 *      pública se puede abrir **sin credenciales** y lo borra.
 *
 * Uso (desde `msf-nestjs/`):
 *
 *   node scripts/probar-appwrite.mjs
 *
 * Lee `.env` del repo. Variables que usa:
 *
 *   APPWRITE_API_URL      base de la API de Appwrite, terminada en `/v1`
 *                         (por defecto `https://cloud.appwrite.io/v1`).
 *   APPWRITE_PROJECT_ID   id del proyecto al que pertenece el bucket.
 *   APPWRITE_API_KEY      secreto de la API key (con scope `files.*`).
 *   APPWRITE_BUCKET       bucket a probar (por defecto `default`).
 *
 * No escribe nada en ningún bucket persistente: la prueba de Storage borra el
 * archivo que sube. Si algo falla, explica qué revisar en el dashboard de
 * Appwrite.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

async function probarApiYStorage() {
  console.log('\n1) Appwrite');

  const base = recortar(entorno.APPWRITE_ENDPOINT) || 'https://cloud.appwrite.io/v1';
  const clave = recortar(entorno.APPWRITE_API_KEY);
  const proyecto = recortar(entorno.APPWRITE_PROJECT_ID);
  const bucket = recortar(entorno.APPWRITE_BUCKET) || 'default';

  if (!base) {
    fallo('Falta APPWRITE_API_URL', 'Por defecto se usa https://cloud.appwrite.io/v1.');
    return;
  }

  if (!clave) {
    fallo(
      'Falta APPWRITE_API_KEY',
      'Creala en Appwrite → Project → API keys (scope: files.*). Guía: `APPWRITE.md`.',
    );
    return;
  }

  ok(`API de Appwrite configurada en ${base}${proyecto ? ` (proyecto ${proyecto})` : ''}`);

  const ruta = `/storage/buckets/${encodeURIComponent(bucket)}/files`;
  const fileId = `msf-prueba-${Date.now()}`;
  const formulario = new FormData();
  formulario.append('fileId', fileId);
  formulario.append('file', new Blob([PNG_1X1], { type: 'image/png' }), 'prueba-appwrite.png');
  formulario.append('permissions[]', 'read("any")');

  let id;

  try {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: 'POST',
      headers: {
        'X-Appwrite-Key': clave,
        ...(proyecto ? { 'X-Appwrite-Project': proyecto } : {}),
      },
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
        `la subida respondió ${respuesta.status}: ${cuerpo?.error?.message ?? cuerpo?.message ?? texto.slice(0, 300)}`,
        'Revisa que el bucket exista y que la API key tenga scope files.* (y que el proyecto sea el correcto).',
      );
      return;
    }

    id = fileId;

    ok(`subida correcta al bucket «${bucket}» (id ${id})`);
  } catch (error) {
    fallo(`no se pudo subir: ${error.message}`, 'Comprueba la URL de la API y la conectividad desde esta máquina.');
    return;
  }

  const urlPublica = `${base}/storage/buckets/${encodeURIComponent(bucket)}/files/${encodeURIComponent(id)}/download${proyecto ? `?project=${encodeURIComponent(proyecto)}` : ''}`;

  try {
    const publica = await fetch(urlPublica, { signal: AbortSignal.timeout(20_000) });

    if (publica.ok) {
      ok(`la URL pública abre sin credenciales: ${urlPublica}`);
    } else {
      fallo(
        `la URL pública respondió ${publica.status}`,
        'Para que las vitrinas muestren las fotos, el bucket y la key deben permitir acceso público (permiso read "any").',
      );
    }
  } catch (error) {
    fallo(`no se pudo abrir la URL pública: ${error.message}`);
  }

  try {
    const borrado = await fetch(
      `${base}/storage/buckets/${encodeURIComponent(bucket)}/files/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          'X-Appwrite-Key': clave,
          ...(proyecto ? { 'X-Appwrite-Project': proyecto } : {}),
        },
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (borrado.ok || borrado.status === 404) {
      ok('el archivo de prueba se borró');
    } else {
      fallo(`el borrado respondió ${borrado.status}`);
    }
  } catch (error) {
    fallo(`no se pudo borrar el archivo de prueba (id ${id}): ${error.message}`);
  }
}

console.log('Prueba de conexión con Appwrite (Storage)');
await probarApiYStorage();

console.log('');

if (fallos.length) {
  console.log(`Resultado: ${fallos.length} comprobación(es) fallaron.`);
  process.exitCode = 1;
} else {
  console.log('Resultado: todo listo para usar Appwrite.');
}
