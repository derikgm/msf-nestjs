// scripts/semilla-local.mjs
/**
 * Datos de prueba para el Postgres local del panel y las dos vitrinas.
 *
 * Uso (con el servidor arrancado en 3000):
 *   node scripts/semilla-local.mjs
 *
 * Opciones por entorno:
 *   API_URL        base del servidor (por defecto http://localhost:3000)
 *   DATABASE_URL   cadena de la base, si no se quiere leer el `.env` del repo
 *   SEMILLA_PASS   contraseña de los usuarios de prueba (por defecto 'prueba1234')
 *
 * Todo se crea **solo si falta**, así que el script se puede repetir sin
 * duplicar secciones, productos ni usuarios.
 *
 * Dos cosas se escriben por SQL en vez de por API, y no es un atajo del script:
 *  - El usuario `admin`: el registro público lo rechaza a propósito (N-2), así
 *    que el primer admin se da de alta desde el servidor, como dice el mensaje
 *    de esa ruta.
 *  - Las subcategorías de **Delys**: `POST /delys/secciones` ignora `padre_id`
 *    (el catálogo de la pastelería es plano por decisión de la API). Se siembran
 *    directo en la tabla para poder comprobar la lectura, que sí devuelve
 *    `padre_id` en `GET /delys/secciones`.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { hashPassword } from '../dist/auth/password.util.js';

const API = process.env.API_URL ?? 'http://localhost:3000';
const PASS = process.env.SEMILLA_PASS ?? 'prueba1234';

/** La cadena de conexión sale del `.env` del repo si no viene por entorno. */
function leerDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const coincidencia = env.match(/^DATABASE_URL=(.*)$/m);

  if (!coincidencia) throw new Error('Falta DATABASE_URL en el entorno y en .env');

  return coincidencia[1].trim();
}

/** Petición a la API; devuelve el JSON y el status sin lanzar excepciones. */
async function pedir(ruta, { metodo = 'GET', token, cuerpo } = {}) {
  const respuesta = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });

  const texto = await respuesta.text();

  try {
    return { status: respuesta.status, json: JSON.parse(texto) };
  } catch {
    return { status: respuesta.status, json: { crudo: texto } };
  }
}

function nota(etiqueta, mensaje) {
  console.log(`${etiqueta} ${mensaje}`);
}

// ---------------------------------------------------------------- usuarios ---

const tokens = {};

async function asegurarUsuario(usuario, nombre, rol) {
  // La lista exige token de admin: sin él todavía, se va directo al alta/login.
  if (tokens.admin) {
    const existente = await pedir('/auth/usuarios', { token: tokens.admin });

    if (existente.json?.usuarios?.some((u) => u.usuario === usuario)) {
      const login = await pedir('/auth/login', { metodo: 'POST', cuerpo: { usuario, password: PASS } });

      if (login.json?.access_token) {
        tokens[rol] = login.json.access_token;
        nota('·', `usuario "${usuario}" (${rol}) ya existía: token obtenido`);
        return;
      }
    }
  }

  // El registro público solo sirve mientras el rol no tenga ningún usuario.
  const alta = await pedir('/auth/registro', {
    metodo: 'POST',
    cuerpo: { nombre, usuario, password: PASS, rol },
  });

  if (alta.json?.access_token) {
    tokens[rol] = alta.json.access_token;
    nota('+', `usuario "${usuario}" (${rol}) creado con token`);
    return;
  }

  const login = await pedir('/auth/login', { metodo: 'POST', cuerpo: { usuario, password: PASS } });

  if (login.json?.access_token) {
    tokens[rol] = login.json.access_token;
    nota('·', `usuario "${usuario}" (${rol}) ya existía: token obtenido`);
    return;
  }

  throw new Error(
    `No se pudo obtener token de "${usuario}" (${alta.status}): ${JSON.stringify(alta.json)}`,
  );
}

async function crearAdminSiFalta(client) {
  const { rows } = await client.query("SELECT 1 FROM usuario WHERE rol = 'admin' LIMIT 1");

  if (rows.length) {
    nota('·', 'ya existe un admin en la base: no se crea otro');
    return;
  }

  await client.query(
    `INSERT INTO usuario (id, nombre, usuario, password_hash, rol, activo, creado_en)
     VALUES (gen_random_uuid(), $1, $2, $3, 'admin', true, now())`,
    ['Administrador de prueba', 'admin', hashPassword(PASS)],
  );

  nota('+', 'usuario "admin" creado por SQL (el registro público no admite el rol admin)');
}

// -------------------------------------------------------------- secciones ---

/** id de sección por nombre y negocio, leyendo el endpoint público de cada uno. */
async function seccionesDe(negocio) {
  const ruta = negocio === 'delys' ? '/delys/secciones' : '/adc/secciones';
  const r = await pedir(ruta);

  return r.json?.secciones ?? [];
}

async function asegurarSeccion(negocio, nombre, padre_id, rol) {
  const actuales = await seccionesDe(negocio);
  const limpia = nombre.trim().toLowerCase();
  const existente = actuales.find((s) => s.nombre === limpia);

  if (existente) {
    nota('·', `sección "${limpia}" (${negocio}) ya existía con id ${existente.id}`);
    return existente.id;
  }

  const ruta = negocio === 'delys' ? '/delys/secciones' : '/adc/secciones';
  const r = await pedir(ruta, { metodo: 'POST', token: tokens[rol], cuerpo: { nombre, padre_id } });

  if (r.status >= 400) {
    throw new Error(`No se pudo crear "${limpia}" (${negocio}, ${r.status}): ${JSON.stringify(r.json)}`);
  }

  const id = r.json.seccion.id;
  nota('+', `sección "${limpia}" (${negocio}) creada con id ${id}${padre_id ? ` (subcategoría de ${padre_id})` : ''}`);

  return id;
}

// -------------------------------------------------------------- productos ---

async function asegurarProducto(negocio, dulce, rol) {
  const rutaLista = negocio === 'delys' ? '/delys/dulces' : '/adc/productos';
  const rutaAlta = negocio === 'delys' ? '/delys/dulces' : '/adc/productos';
  const actuales = (await pedir(rutaLista)).json;
  const productos = actuales.dulces ?? actuales.productos ?? [];
  const existente = productos.find((p) => p.nombre === dulce.nombre);

  if (existente) {
    if (existente.seccion_id !== dulce.seccion_id) {
      await pedir(`${rutaAlta}/${existente.id}`, {
        metodo: 'PATCH',
        token: tokens[rol],
        cuerpo: { seccion_id: dulce.seccion_id },
      });
      nota('~', `"${dulce.nombre}" reubicado en la sección ${dulce.seccion_id}`);
    }

    return existente.id;
  }

  const r = await pedir(rutaAlta, { metodo: 'POST', token: tokens[rol], cuerpo: dulce });

  if (r.status >= 400) {
    throw new Error(`No se pudo crear "${dulce.nombre}" (${r.status}): ${JSON.stringify(r.json)}`);
  }

  const creado = r.json.dulce ?? r.json.producto;
  nota('+', `producto "${dulce.nombre}" creado con id ${creado.id}`);

  return creado.id;
}

// ------------------------------------------------------------------- main ---

const ARBOL_ADC = [
  { nombre: 'electronico', hijos: ['neveras', 'ventiladores'] },
  { nombre: 'iluminacion', hijos: ['focus led', 'guirnaldas'] },
  { nombre: 'instalaciones', hijos: ['paneles solares', 'baterias ecoflow'] },
];

const PRODUCTOS_ADC = [
  { nombre: 'Nevera No Frost 250 L', precio: 320, moneda: 'USD', seccion: 'neveras' },
  { nombre: 'Ventilador de pedestal', precio: 45, moneda: 'USD', seccion: 'ventiladores' },
  { nombre: 'Focus LED empotrable 12 W', precio: 8.5, moneda: 'USD', seccion: 'focus led' },
  { nombre: 'Guirnalda navideña 100 LED', precio: 12, moneda: 'USD', seccion: 'guirnaldas' },
  { nombre: 'Panel solar 200 W', precio: 140, moneda: 'USD', seccion: 'paneles solares' },
  { nombre: 'Batería EcoFlow Delta 3', precio: 890, moneda: 'USD', seccion: 'baterias ecoflow' },
  { nombre: 'Breaker bifásico 40 A', precio: 22, moneda: 'USD', seccion: null },
];

const PRODUCTOS_DELYS = [
  { nombre: 'Torta de piña', precio: 25, moneda: 'CUP', seccion: 'tortas de cumpleaños' },
  { nombre: 'Galletas de coco (docena)', precio: 120, moneda: 'CUP', seccion: 'de sobre' },
];

async function main() {
  const client = new pg.Client({ connectionString: leerDatabaseUrl() });
  await client.connect();

  console.log(`Sembrando contra ${API}`);

  await crearAdminSiFalta(client);
  await asegurarUsuario('delys', 'Delys (pastelería)', 'delys');
  await asegurarUsuario('adc', 'ADC (material eléctrico)', 'adc');
  await asegurarUsuario('admin', 'Administrador de prueba', 'admin');

  // --- ADC: árbol de categorías y subcategorías, todo por API -----------------
  const idsAdc = {};

  for (const rama of ARBOL_ADC) {
    idsAdc[rama.nombre] = await asegurarSeccion('adc', rama.nombre, undefined, 'adc');

    for (const hija of rama.hijos) {
      idsAdc[hija] = await asegurarSeccion('adc', hija, idsAdc[rama.nombre], 'adc');
    }
  }

  for (const p of PRODUCTOS_ADC) {
    await asegurarProducto('adc', {
      nombre: p.nombre,
      precio: p.precio,
      moneda: p.moneda,
      seccion_id: p.seccion ? idsAdc[p.seccion] : undefined,
    }, 'adc');
  }

  // Una instalación de ADC, para que el panel y la vitrina tengan dónde mirar.
  const instalaciones = await pedir('/adc/instalaciones');

  if (!(instalaciones.json?.instalaciones ?? instalaciones.json ?? []).length) {
    await pedir('/adc/instalaciones', {
      metodo: 'POST',
      token: tokens.adc,
      cuerpo: {
        nombre_servicio: 'Instalación EcoFlow Delta 3',
        precio: 60,
        moneda: 'USD',
        descripcion: ['Se visita desde temprano', 'Si llegamos tarde, hay descuento'],
      },
    });
    nota('+', 'instalación de ADC creada');
  } else {
    nota('·', 'ADC ya tenía instalaciones: no se crea otra');
  }

  // --- Delys: principales por API y subcategorías por SQL --------------------
  const tortas = await asegurarSeccion('delys', 'tortas', undefined, 'delys');
  const galletas = await asegurarSeccion('delys', 'galletas', undefined, 'delys');

  for (const [nombre, padre] of [['tortas de cumpleaños', tortas], ['de sobre', galletas]]) {
    const limpia = nombre.toLowerCase();
    const { rows } = await client.query(
      'INSERT INTO seccion (nombre, negocio, padre_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id',
      [limpia, 'delys', padre],
    );

    // ON CONFLICT DO NOTHING no devuelve fila si la sección ya estaba; se busca.
    const id = rows[0]?.id
      ?? (await client.query('SELECT id FROM seccion WHERE negocio = $1 AND nombre = $2', ['delys', limpia])).rows[0].id;

    if (rows.length) nota('+', `subcategoría de Delys "${limpia}" creada por SQL con id ${id} (cuelga de ${padre})`);
    else nota('·', `subcategoría de Delys "${limpia}" ya existía con id ${id}`);

    idsAdc[limpia] = id;
  }

  for (const p of PRODUCTOS_DELYS) {
    await asegurarProducto('delys', {
      nombre: p.nombre,
      precio: p.precio,
      moneda: p.moneda,
      seccion_id: idsAdc[p.seccion],
    }, 'delys');
  }

  // Combos y un pedido, para que el panel de Delys no esté vacío.
  const combos = await pedir('/delys/combos');

  if (!(combos.json?.combos ?? []).length) {
    await pedir('/delys/combos', {
      metodo: 'POST',
      token: tokens.delys,
      cuerpo: {
        nombre_combo: 'Combo merienda',
        precio: 30,
        moneda: 'CUP',
        dulces: [
          { nombre_dulce: 'Torta de piña', cantidad: 2 },
          { nombre_dulce: 'Buñuelo de guayaba', cantidad: 6 },
        ],
      },
    });
    nota('+', 'combo de Delys creado');
  }

  const dulcesDelys = (await pedir('/delys/dulces')).json.dulces ?? [];
  const pedidos = await pedir('/delys/pedidos', { token: tokens.delys });

  if (dulcesDelys.length && !(pedidos.json?.pedidos ?? []).length) {
    const fecha = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

    await pedir('/delys/pedido', {
      metodo: 'POST',
      cuerpo: {
        direccion: 'Calle 23 #44, Vedado',
        telefono: '52541122',
        fecha,
        notas: 'Pedido de prueba sembrado localmente',
        encargos: [{ dulce: dulcesDelys[0].id, cantidad: 2 }],
      },
    });
    nota('+', `pedido de prueba para el ${fecha}`);
  }

  // --- Resumen --------------------------------------------------------------
  const resumen = await client.query(`
    SELECT s.negocio,
           count(*) FILTER (WHERE s.padre_id IS NULL) AS principales,
           count(*) FILTER (WHERE s.padre_id IS NOT NULL) AS subcategorias
      FROM seccion s GROUP BY s.negocio ORDER BY s.negocio
  `);
  const productos = await client.query(`
    SELECT negocio, count(*) AS n, count(*) FILTER (WHERE seccion_id IS NULL) AS sin_seccion
      FROM producto GROUP BY negocio ORDER BY negocio
  `);
  const cuotas = await client.query('SELECT rol, limite_bytes FROM storage_quota ORDER BY rol');

  console.log('\nSecciones por negocio:');
  for (const f of resumen.rows) {
    console.log(`  ${f.negocio}: ${f.principales} principales, ${f.subcategorias} subcategorías`);
  }
  console.log('Productos por negocio:');
  for (const f of productos.rows) {
    console.log(`  ${f.negocio}: ${f.n} (${f.sin_seccion} sin sección asignada)`);
  }
  console.log(`Cuotas de storage: ${cuotas.rows.map((f) => `${f.rol}=${f.limite_bytes}B`).join(', ') || '(ninguna)'}`);
  console.log(`\nLogués con cualquiera de estos usuarios y la contraseña "${PASS}": delys, adc, admin`);

  await client.end();
}

main().catch((error) => {
  console.error(`Sembrado fallido: ${error.message}`);
  process.exit(1);
});
