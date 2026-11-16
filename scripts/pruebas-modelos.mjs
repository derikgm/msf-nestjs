// scripts/pruebas-modelos.mjs
/**
 * Batería de pruebas de **modelos de una publicación** contra un servidor vivo.
 *
 * Uso (con el servidor y el Postgres local arrancados, y tras `semilla-local.mjs`):
 *   node scripts/pruebas-modelos.mjs
 *
 * Opciones: API_URL (por defecto http://localhost:3000), SEMILLA_PASS ('prueba1234').
 *
 * A diferencia de `test/contrato.spec.ts` (que molea el servicio y prueba la
 * forma de la respuesta), esto ejercita la base de datos real: el `UNIQUE` por
 * publicación, el `404` cuando la publicación es de otro negocio, el `jsonb` de
 * la ficha y el `ON DELETE CASCADE` al borrar la publicación.
 *
 * Crea su propia publicación de prueba y la borra al terminar —los modelos se
 * van con ella por cascada—, así que se puede repetir. Sale con código 1 si algo
 * no cumple lo esperado.
 */
const API = process.env.API_URL ?? 'http://localhost:3000';
const PASS = process.env.SEMILLA_PASS ?? 'prueba1234';

let aprobadas = 0;
let falladas = 0;

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

async function login(usuario) {
  const r = await pedir('/auth/login', { metodo: 'POST', cuerpo: { usuario, password: PASS } });

  if (!r.json.access_token) {
    throw new Error(`No hay token de ${usuario} (${r.status}): ${JSON.stringify(r.json)}`);
  }

  return r.json.access_token;
}

/**
 * Comparación profunda con las claves ordenadas: Postgres reordena las claves de
 * un `jsonb` (por longitud y luego alfabéticamente), así que comparar el JSON tal
 * cual daría FALSA una prueba que sí guardó la ficha bien.
 */
function estable(valor) {
  if (valor === null || typeof valor !== 'object') return valor;
  if (Array.isArray(valor)) return valor.map(estable);

  return Object.fromEntries(Object.keys(valor).sort().map((clave) => [clave, estable(valor[clave])]));
}

function comprobar(caso, esperado, recibido, detalle = '') {
  const ok = JSON.stringify(estable(esperado)) === JSON.stringify(estable(recibido));

  if (ok) {
    aprobadas += 1;
    console.log(`  ok   ${caso}`);
  } else {
    falladas += 1;
    console.log(
      `  FALLA ${caso}: se esperaba ${JSON.stringify(esperado)}, llegó ${JSON.stringify(recibido)}` +
        `${detalle ? ` · ${detalle}` : ''}`,
    );
  }
}

/** Status de una petición, para comparar contra el código esperado. */
async function estatus(caso, esperado, peticion) {
  const r = await peticion();
  comprobar(caso, esperado, r.status, JSON.stringify(r.json).slice(0, 200));

  return r;
}

async function main() {
  console.log(`Probando modelos de una publicación contra ${API}\n`);

  const adc = await login('adc');
  const delys = await login('delys');

  // Publicación de prueba: se crea aquí y se borra al final (llevándose los
  // modelos por cascada), para no depender del estado de la base.
  const publicacion = await estatus('publicación de prueba creada', 201, () =>
    pedir('/adc/productos', {
      metodo: 'POST',
      token: adc,
      cuerpo: { nombre: 'Prueba modelos nevera', precio: 100, moneda: 'CUP' },
    }),
  );
  const idPub = publicacion.json.producto.id;

  console.log('\nAlta y lectura');
  const primero = await estatus('POST /adc/productos/:id/modelos crea el primer modelo', 201, () =>
    pedir(`/adc/productos/${idPub}/modelos`, {
      metodo: 'POST',
      token: adc,
      cuerpo: { nombre: '240 L inverter', precio: 320, moneda: 'usd', atributos: { Peso: '38 kg' } },
    }),
  );
  const segundo = await estatus('y un segundo modelo', 201, () =>
    pedir(`/adc/productos/${idPub}/modelos`, {
      metodo: 'POST',
      token: adc,
      cuerpo: { nombre: '340 L', precio: 45000, atributos: { Peso: '51 kg', 'Capacidad ': ' 340 L ' } },
    }),
  );

  const modelo = primero.json.modelo;
  comprobar('la moneda se normaliza a mayúsculas', 'USD', modelo.moneda);
  comprobar('sin moneda llega CUP (el default de la columna)', 'CUP', segundo.json.modelo.moneda);
  comprobar('el precio y la ficha viajan en la respuesta', 320, modelo.precio);
  comprobar('la ficha se guarda como se escribió', { Peso: '38 kg' }, modelo.atributos);
  comprobar('no se cuela imagen_bytes en la API', undefined, modelo.imagen_bytes);
  comprobar('tampoco la relación producto', undefined, modelo.producto);
  comprobar('las claves y valores de la ficha se recortan', { Peso: '51 kg', Capacidad: '340 L' },
    segundo.json.modelo.atributos);

  const publicacionLeida = await pedir(`/adc/productos/${idPub}/modelos`);
  comprobar('GET sin token lista los modelos (la vitrina es pública)', 200, publicacionLeida.status);
  comprobar(
    'en el orden en que se dieron de alta',
    [modelo.id, segundo.json.modelo.id],
    publicacionLeida.json.modelos.map((m) => m.id),
  );
  comprobar('cada modelo dice de qué publicación cuelga', idPub, publicacionLeida.json.modelos[0].producto_id);

  const catalogo = await pedir('/adc/productos');
  const enCatalogo = catalogo.json.productos.find((p) => p.id === idPub);
  comprobar('GET /adc/productos trae los modelos dentro del producto', 2, enCatalogo?.modelos?.length);
  const sinModelos = catalogo.json.productos.find((p) => p.id !== idPub && !p.nombre.startsWith('Prueba modelos'));
  comprobar('un producto sin modelos responde una lista vacía', [], sinModelos?.modelos);

  console.log('\nReglas de la base');
  await estatus('dos modelos con el mismo nombre en la misma publicación → 409', 409, () =>
    pedir(`/adc/productos/${idPub}/modelos`, {
      metodo: 'POST',
      token: adc,
      cuerpo: { nombre: '240 L inverter', precio: 1 },
    }),
  );
  const otra = await estatus('se crea OTRA publicación', 201, () =>
    pedir('/adc/productos', {
      metodo: 'POST',
      token: adc,
      cuerpo: { nombre: 'Prueba modelos ventilador', precio: 10 },
    }),
  );
  const idOtra = otra.json.producto.id;
  await estatus('el mismo nombre de modelo en esa otra publicación sí vale', 201, () =>
    pedir(`/adc/productos/${idOtra}/modelos`, {
      metodo: 'POST',
      token: adc,
      cuerpo: { nombre: '240 L inverter', precio: 55 },
    }),
  );

  await estatus('modelo colgado de una publicación inexistente → 404', 404, () =>
    pedir('/adc/productos/987654/modelos', { metodo: 'POST', token: adc, cuerpo: { nombre: 'x', precio: 1 } }),
  );

  // La tabla `producto` es compartida: un id de Delys no es una publicación de
  // ADC, y `ModelosService.publicacion()` filtra por `negocio`.
  const respuestaDelys = await pedir('/delys/dulces', { token: delys });
  const listaDelys = respuestaDelys.json.dulces ?? respuestaDelys.json.productos ?? [];
  const idDelys = Array.isArray(listaDelys) ? listaDelys[0]?.id : undefined;

  if (idDelys === undefined) {
    console.log('  omite: no hay dulces de Delys en la base para probar el cruce de negocios');
  } else {
    await estatus('modelo colgado de un dulce de OTRO negocio → 404', 404, () =>
      pedir(`/adc/productos/${idDelys}/modelos`, { metodo: 'POST', token: adc, cuerpo: { nombre: 'x', precio: 1 } }),
    );
  }
  await estatus('el token de delys no puede gestionar el catálogo de ADC', 403, () =>
    pedir(`/adc/modelos/${modelo.id}`, { metodo: 'PATCH', token: delys, cuerpo: { precio: 1 } }),
  );

  console.log('\nEdición');
  const renombrado = await estatus('PATCH renombra y cambia el precio', 200, () =>
    pedir(`/adc/modelos/${modelo.id}`, {
      metodo: 'PATCH',
      token: adc,
      cuerpo: { nombre: '240 L inverter nova', precio: 350, atributos: { Peso: '39 kg', Ruido: '42 dB' } },
    }),
  );
  comprobar('el nombre cambia', '240 L inverter nova', renombrado.json.modelo.nombre);
  comprobar('la ficha se reemplaza entera, no se fusiona', { Peso: '39 kg', Ruido: '42 dB' },
    renombrado.json.modelo.atributos);

  await estatus('renombrar a un nombre ya usado en la publicación → 409', 409, () =>
    pedir(`/adc/modelos/${modelo.id}`, { metodo: 'PATCH', token: adc, cuerpo: { nombre: '340 L' } }),
  );
  await estatus('PATCH sin ningún campo es un error del cliente, no un no-op', 400, () =>
    pedir(`/adc/modelos/${modelo.id}`, { metodo: 'PATCH', token: adc, cuerpo: {} }),
  );
  await estatus('renombrarse a sí mismo no choca con el UNIQUE', 200, () =>
    pedir(`/adc/modelos/${modelo.id}`, { metodo: 'PATCH', token: adc, cuerpo: { nombre: '240 L inverter nova' } }),
  );

  console.log('\nValidaciones del cuerpo');
  const casos = [
    ['precio negativo → 400', { nombre: 'malo', precio: -1 }, 400],
    ['precio con tres decimales → 400', { nombre: 'malo', precio: 1.234 }, 400],
    ['nombre vacío → 400', { nombre: '   ', precio: 1 }, 400],
    ['ficha que no es objeto → 400', { nombre: 'malo', precio: 1, atributos: 'Peso: 38 kg' }, 400],
    ['valor de la ficha que es lista → 400', { nombre: 'malo', precio: 1, atributos: { Peso: ['38 kg'] } }, 400],
    ['etiqueta sin valor → 400', { nombre: 'malo', precio: 1, atributos: { Peso: '' } }, 400],
    ['más de doce características → 400',
      { nombre: 'malo', precio: 1, atributos: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`c${i}`, 'v'])) }, 400],
    ['campo que el DTO no conoce → 400', { nombre: 'malo', precio: 1, producto_id: 99 }, 400],
  ];

  for (const [caso, cuerpo, esperado] of casos) {
    await estatus(caso, esperado, () =>
      pedir(`/adc/productos/${idPub}/modelos`, { metodo: 'POST', token: adc, cuerpo }),
    );
  }

  await estatus('crear sin token → 401', 401, () =>
    pedir(`/adc/productos/${idPub}/modelos`, { metodo: 'POST', cuerpo: { nombre: 'x', precio: 1 } }),
  );

  // Un número suelto se acepta y se guarda como texto: el panel puede mandar
  // `{"Peso": 38}` y la vitrina lo pinta igual que "38".
  const numero = await pedir(`/adc/productos/${idPub}/modelos`, {
    metodo: 'POST',
    token: adc,
    cuerpo: { nombre: '420 L', precio: 1, atributos: { Peso: 38 } },
  });
  comprobar('un valor numérico de la ficha se guarda como texto', '38', numero.json.modelo?.atributos?.Peso);

  console.log('\nBorrado');
  await estatus('DELETE de un modelo', 200, () => pedir(`/adc/modelos/${numero.json.modelo.id}`, { metodo: 'DELETE', token: adc }));
  await estatus('borrar dos veces el mismo modelo → 404', 404, () =>
    pedir(`/adc/modelos/${numero.json.modelo.id}`, { metodo: 'DELETE', token: adc }),
  );

  // La cascada se comprueba por la propia API: si la FK no fuera CASCADE, borrar
  // la publicación con modelos plantaría contra la constraint.
  await estatus('borrar la publicación con modelos puestos (cascada) → 200', 200, () =>
    pedir(`/adc/productos/${idPub}`, { metodo: 'DELETE', token: adc }),
  );
  await estatus('y después sus modelos ya no existen', 404, () =>
    pedir(`/adc/productos/${idPub}/modelos`, { metodo: 'POST', token: adc, cuerpo: { nombre: 'x', precio: 1 } }),
  );

  // Limpieza: la otra publicación de prueba y su modelo (la cascada se repite).
  await pedir(`/adc/productos/${idOtra}`, { metodo: 'DELETE', token: adc }).catch(() => {});

  const sobrantes = await pedir('/adc/productos');
  const restos = (sobrantes.json.productos ?? []).filter((p) => p.nombre.startsWith('Prueba modelos'));
  comprobar('no queda ninguna publicación de prueba', [], restos.map((p) => p.id));

  console.log(`\n${aprobadas} aprobadas, ${falladas} falladas`);

  if (falladas) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`La batería no pudo correrse: ${error.message}`);
  process.exit(1);
});
