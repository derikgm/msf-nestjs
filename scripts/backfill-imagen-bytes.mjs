/**
 * Backfill de `producto.imagen_bytes` (ítem N-24 de pulimiento.md).
 *
 * Hay productos con `imagen_url` pero `imagen_bytes` en NULL: el contador de la
 * cuota por rol no refleja lo que Storage ocupa de verdad. Ese contador solo se
 * llena al subir la imagen desde el endpoint nuevo, así que las imágenes
 * anteriores al sistema de cuota (o llegadas con `migraciones/002-adc.sql`)
 * quedaban en NULL para siempre.
 *
 * POR QUÉ ES UN SCRIPT Y NO VA DENTRO DE NESTJS: el usuario prefiere no meterle
 * cómputo al servidor. Esto se ejecuta una vez desde la máquina de desarrollo y
 * no hay nada que calcular en cada petición de lectura: el campo sigue siendo un
 * entero guardado en la fila.
 *
 * USO (desde la carpeta msf-nestjs):
 *
 *   node --env-file=.env scripts/backfill-imagen-bytes.mjs            # dry-run
 *   node --env-file=.env scripts/backfill-imagen-bytes.mjs --limite=3 # prueba pequeña
 *   node --env-file=.env scripts/backfill-imagen-bytes.mjs --aplicar  # escribe
 *
 * Sin argumentos NO escribe nada: solo imprime lo que haría.
 */
import pg from 'pg';

// --- argumentos ------------------------------------------------------------
const args = process.argv.slice(2);
const aplicar = args.includes('--aplicar');
const limiteArg = args.find((a) => a.startsWith('--limite='));
const limite = limiteArg ? Number(limiteArg.split('=')[1]) : Infinity;

if (limiteArg && !Number.isFinite(limite)) {
  console.error('`--limite=` necesita un número, p. ej. `--limite=5`.');
  process.exit(1);
}

// --- variables de entorno --------------------------------------------------
// Solo se comprueba que existen; nunca se imprimen los valores.
const faltan = ['DATABASE_URL', 'SUPABASE_URL'].filter((clave) => !process.env[clave]);
if (faltan.length) {
  console.error(
    `Faltan variables de entorno: ${faltan.join(', ')}. ` +
      `Ejecuta con  node --env-file=.env scripts/backfill-imagen-bytes.mjs`,
  );
  process.exit(1);
}

/**
 * La misma decisión que toma `src/app.module.ts`: Supabase entrega un certificado
 * que Node no valida con su almacén de confianza. Es la excepción documentada
 * pendiente del ítem N-6, y este script la comparte a propósito.
 */
const cliente = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- tamaño de una imagen --------------------------------------------------
/**
 * Devuelve los bytes reales del objeto en Storage, o tira la excepción con el
 * motivo. Dos pasos, del más barato al más caro:
 *
 *  1. `HEAD` a la URL pública: Supabase responde `content-length` sin cuerpo.
 *  2. Si no viene el tamaño (CDN que lo omite), `Range: bytes=0-0` y del
 *     `content-range` (`bytes 0-0/12345`) se lee el total: baja un solo byte.
 */
async function pesoEnStorage(url) {
  const head = await fetch(url, { method: 'HEAD' });

  if (!head.ok) {
    const fallo = new Error(`HTTP ${head.status}`);
    fallo.codigo = head.status;
    throw fallo;
  }

  const directo = head.headers.get('content-length');
  if (directo) return Number(directo);

  const parcial = await fetch(url, { headers: { Range: 'bytes=0-0' } });
  const rango = parcial.headers.get('content-range'); // "bytes 0-0/12345"
  const total = rango?.split('/')[1];

  if (parcial.ok && total && total !== '*') return Number(total);

  throw new Error('Storage no informa del tamaño del archivo');
}

/** Saca `bucket/path` de una URL pública de Supabase, o null si no encaja. */
function bucketYPath(url) {
  try {
    const { pathname } = new URL(url);
    const marca = '/storage/v1/object/public/';
    const i = pathname.indexOf(marca);
    return i === -1 ? null : pathname.slice(i + marca.length);
  } catch {
    return null;
  }
}

// --- principal -------------------------------------------------------------
async function main() {
  await cliente.connect();

  const { rows: pendientes } = await cliente.query(
    `SELECT id, nombre, negocio, imagen_url
       FROM producto
      WHERE imagen_url IS NOT NULL AND imagen_bytes IS NULL
      ORDER BY id`,
  );

  const lista = pendientes.slice(0, limite);

  console.log(
    `\nN-24 · backfill de imagen_bytes` +
      `\n--------------------------------` +
      `\nFilas con imagen y contador en NULL: ${pendientes.length}` +
      `\nModo: ${aplicar ? 'APROBAR (--aplicar)' : 'dry-run (sin escritura)'}\n`,
  );

  if (pendientes.length === 0) {
    console.log('Nada que hacer: el contador ya cuadra con Storage.');
    return;
  }

  const resultados = { rellenados: 0, omitidos: [], incidencias: [] };

  for (const fila of lista) {
    const etiqueta = `#${fila.id} ${fila.nombre} [${fila.negocio}]`;
    const ruta = bucketYPath(fila.imagen_url);

    if (!ruta) {
      resultados.incidencias.push(`${etiqueta} · URL no reconocible: ${fila.imagen_url}`);
      continue;
    }

    let bytes;
    try {
      bytes = await pesoEnStorage(fila.imagen_url);
    } catch (error) {
      // Un 404 significa que la imagen ya no existe en Storage: rellenar el
      // tamaño sería mentir, y además habría que plantearse borrar la
      // `imagen_url` huérfana (se reporta, no se toca aquí).
      const motivo =
        error.codigo === 404
          ? 'imagen ausente en Storage (404) — no se rellena'
          : `no se pudo medir (${error.message})`;
      resultados.incidencias.push(`${etiqueta} · ${motivo}`);
      continue;
    }

    if (!aplicar) {
      console.log(`  ${etiqueta} → ${bytes} bytes`);
      resultados.rellenados += 1;
      continue;
    }

    // La condición `imagen_bytes IS NULL` es la garantía: si otro proceso lo
    // rellenó entre medias, no pisamos su valor.
    const { rowCount } = await cliente.query(
      'UPDATE producto SET imagen_bytes = $1 WHERE id = $2 AND imagen_bytes IS NULL',
      [bytes, fila.id],
    );

    if (rowCount > 0) {
      console.log(`  ${etiqueta} → ${bytes} bytes ✓`);
      resultados.rellenados += 1;
    } else {
      resultados.omitidos.push(`${etiqueta} · ya estaba rellenado por otro proceso`);
    }
  }

  console.log(`\nResumen:`);
  console.log(`  rellenados      ${resultados.rellenados}`);
  if (resultados.omitidos.length) console.log(`  sin tocar        ${resultados.omitidos.length}`);
  if (resultados.incidencias.length) {
    console.log(`  incidencias     ${resultados.incidencias.length}`);
    for (const i of resultados.incidencias) console.log(`    - ${i}`);
  }
  if (pendientes.length > lista.length) {
    console.log(`  (se han mirado ${lista.length} de ${pendientes.length} por --limite)`);
  }
  if (!aplicar) {
    console.log(`\nDry-run: no se ha escrito nada. Repite con --aplicar para aplicarlo.\n`);
  }
}

main()
  .catch((error) => {
    console.error(`\nFalló el backfill: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => cliente.end());
