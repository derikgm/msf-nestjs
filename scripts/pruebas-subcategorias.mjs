// scripts/pruebas-subcategorias.mjs
/**
 * Batería de pruebas de subcategorías contra un servidor vivo.
 *
 * Uso (con el servidor y el Postgres local arrancados, y tras `semilla-local.mjs`):
 *   node scripts/pruebas-subcategorias.mjs
 *
 * Opciones: API_URL (por defecto http://localhost:3000), SEMILLA_PASS ('prueba1234').
 *
 * Crea secciones y productos con nombre de prueba y **los borra al terminar**,
 * así que se puede repetir. Sale con código 1 si algo no cumple lo esperado,
 * lo que lo deja listo para correrlo en un `check` antes de dar por buena una
 * entrega. Las reglas probadas son las de `CatalogoService` (un solo nivel, padre
 * del mismo negocio, nombres reservados, 409 con contenido dentro).
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

  if (!r.json.access_token) throw new Error(`No hay token de ${usuario} (${r.status}): ${JSON.stringify(r.json)}`);

  return r.json.access_token;
}

function comprobar(caso, esperado, recibido, detalle = '') {
  const ok = esperado === recibido;

  if (ok) {
    aprobadas += 1;
    console.log(`  ok   ${caso} → ${recibido}`);
  } else {
    falladas += 1;
    console.log(`  FALLA ${caso}: se esperaba ${esperado}, llegó ${recibido}${detalle ? ` · ${detalle}` : ''}`);
  }
}

/** Status de una petición, para comparar contra el código esperado. */
async function estatus(caso, esperado, peticion) {
  const r = await peticion();
  comprobar(caso, esperado, r.status, JSON.stringify(r.json).slice(0, 160));

  return r;
}

async function main() {
  console.log(`Probando subcategorías contra ${API}\n`);

  const adc = await login('adc');
  const delys = await login('delys');

  const listaAdc = (await pedir('/adc/secciones')).json.secciones;
  const listaDelys = (await pedir('/delys/secciones')).json.secciones;

  // Principal con subcategorías y que no sea la reservada: es la que sirven las
  // pruebas de "no puede bajar a subcategoría" y "no se borra con hijos dentro".
  const hijosDe = (lista) => (id) => lista.filter((s) => s.padre_id === id).length;
  const conHijos = hijosDe(listaAdc);
  const principalAdc = listaAdc.find((s) => s.padre_id === null && s.nombre !== 'dulces' && conHijos(s.id) > 0);
  const subcatAdc = listaAdc.find((s) => s.padre_id !== null);
  const subcatDelys = listaDelys.find((s) => s.padre_id !== null);

  // Creaciones que hay que deshacer al final.
  const porBorrar = [];

  console.log('Lectura del árbol');
  comprobar('GET /adc/secciones existe', true, Array.isArray(listaAdc));
  comprobar('toda sección trae padre_id', true, listaAdc.every((s) => 'padre_id' in s));
  comprobar('hay al menos una principal', true, Boolean(principalAdc));
  comprobar('hay al menos una subcategoría', true, Boolean(subcatAdc));
  comprobar('la subcategoría cuelga de una principal', true, listaAdc.some((s) => s.id === subcatAdc?.padre_id));

  console.log('\nAlta de secciones (ADC)');
  const zona = await estatus('nombre con mayúsculas se normaliza', 201, () =>
    pedir('/adc/secciones', { metodo: 'POST', token: adc, cuerpo: { nombre: 'Zona De Prueba' } }),
  );

  if (zona.json.seccion) {
    porBorrar.push(zona.json.seccion.id);
    comprobar('el nombre llega en minúsculas', 'zona de prueba', zona.json.seccion.nombre);
    comprobar('sin padre → principal', null, zona.json.seccion.padre_id);
  }

  await estatus('subcategoría de una subcategoría se rechaza', 400, () =>
    pedir('/adc/secciones', { metodo: 'POST', token: adc, cuerpo: { nombre: 'nieta de prueba', padre_id: subcatAdc.id } }),
  );
  await estatus('padre inexistente', 404, () =>
    pedir('/adc/secciones', { metodo: 'POST', token: adc, cuerpo: { nombre: 'huerfana', padre_id: 999999 } }),
  );
  await estatus('padre de OTRO negocio', 404, () =>
    pedir('/adc/secciones', { metodo: 'POST', token: adc, cuerpo: { nombre: 'cruzada', padre_id: subcatDelys?.id ?? 1 } }),
  );
  await estatus('nombre reservado "dulces"', 400, () =>
    pedir('/adc/secciones', { metodo: 'POST', token: adc, cuerpo: { nombre: 'dulces' } }),
  );
  await estatus('nombre repetido', 409, () =>
    pedir('/adc/secciones', { metodo: 'POST', token: adc, cuerpo: { nombre: 'ZONA DE PRUEBA' } }),
  );
  await estatus('alta sin token', 401, () =>
    pedir('/adc/secciones', { metodo: 'POST', cuerpo: { nombre: 'anonima' } }),
  );
  await estatus('alta con token de otro rol', 403, () =>
    pedir('/adc/secciones', { metodo: 'POST', token: delys, cuerpo: { nombre: 'ajena' } }),
  );

  console.log('\nMover y renombrar');
  await estatus('una sección no puede ser su propio padre', 400, () =>
    pedir(`/adc/secciones/${zona.json.seccion.id}`, { metodo: 'PATCH', token: adc, cuerpo: { padre_id: zona.json.seccion.id } }),
  );
  await estatus('principal con subcategorías no baja a subcategoría', 400, () =>
    pedir(`/adc/secciones/${principalAdc.id}`, { metodo: 'PATCH', token: adc, cuerpo: { padre_id: zona.json.seccion.id } }),
  );
  await estatus('PATCH vacío', 400, () =>
    pedir(`/adc/secciones/${zona.json.seccion.id}`, { metodo: 'PATCH', token: adc }),
  );

  const movida = await pedir(`/adc/secciones/${zona.json.seccion.id}`, {
    metodo: 'PATCH',
    token: adc,
    cuerpo: { padre_id: principalAdc.id },
  });
  comprobar('cuelga de una principal con PATCH', 200, movida.status);
  comprobar('el padre queda anotado', principalAdc.id, movida.json.seccion?.padre_id);

  const subida = await pedir(`/adc/secciones/${zona.json.seccion.id}`, {
    metodo: 'PATCH',
    token: adc,
    cuerpo: { padre_id: null },
  });
  comprobar('padre_id null la devuelve a principal', null, subida.json.seccion?.padre_id);

  const renombrada = await pedir(`/adc/secciones/${zona.json.seccion.id}`, {
    metodo: 'PATCH',
    token: adc,
    cuerpo: { nombre: 'Zona Renombrada' },
  });
  comprobar('renombrar normaliza a minúsculas', 'zona renombrada', renombrada.json.seccion?.nombre);

  console.log('\nBorrado protegido');
  const dulcesAdc = (await pedir('/adc/secciones')).json.secciones.find((s) => s.nombre === 'dulces');
  await estatus('no se borra la sección reservada', 400, () =>
    pedir(`/adc/secciones/${dulcesAdc?.id ?? 1}`, { metodo: 'DELETE', token: adc }),
  );
  await estatus('no se borra una principal con subcategorías', 409, () =>
    pedir(`/adc/secciones/${principalAdc.id}`, { metodo: 'DELETE', token: adc }),
  );

  const conProducto = await pedir('/adc/secciones', {
    metodo: 'POST',
    token: adc,
    cuerpo: { nombre: 'llena de prueba' },
  });
  porBorrar.push(conProducto.json.seccion.id);

  const producto = await pedir('/adc/productos', {
    metodo: 'POST',
    token: adc,
    cuerpo: { nombre: 'Foco de prueba', precio: 3.5, moneda: 'USD', seccion_id: conProducto.json.seccion.id },
  });
  comprobar('producto en sección creada', 201, producto.status);

  const idProducto = producto.json.producto?.id;
  await estatus('no se borra una sección con productos', 409, () =>
    pedir(`/adc/secciones/${conProducto.json.seccion.id}`, { metodo: 'DELETE', token: adc }),
  );

  const vitrina = (await pedir('/adc/productos')).json;
  const visible = vitrina.productos.find((p) => p.id === idProducto);
  comprobar('el producto sale en la vitrina', true, Boolean(visible));
  comprobar('la vitrina nombra su sección', 'llena de prueba', visible?.seccion);

  await estatus('sección vacía sí se borra', 200, async () => {
    await pedir(`/adc/productos/${idProducto}`, { metodo: 'DELETE', token: adc });

    return pedir(`/adc/secciones/${conProducto.json.seccion.id}`, { metodo: 'DELETE', token: adc });
  });

  console.log('\nLectura de Delys (el árbol se sirve, pero no se escribe por API)');
  comprobar('GET /delys/secciones trae subcategorías', true, Boolean(subcatDelys));
  comprobar('la subcategoría de Delys cuelga de su principal', true, listaDelys.some((s) => s.id === subcatDelys?.padre_id));

  const intentoDelys = await pedir('/delys/secciones', {
    metodo: 'POST',
    token: delys,
    cuerpo: { nombre: 'prueba con padre', padre_id: principalAdc.id },
  });
  comprobar('POST /delys/secciones con padre_id crea principal', null, intentoDelys.json.seccion?.padre_id);

  if (intentoDelys.json.seccion) porBorrar.push(intentoDelys.json.seccion.id);

  // Limpieza: primero lo último que se creó.
  for (const id of porBorrar.reverse()) {
    await pedir(`/adc/secciones/${id}`, { metodo: 'DELETE', token: adc }).catch(() => {});
  }

  console.log(`\n${aprobadas} aprobadas, ${falladas} falladas`);

  if (falladas) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`La batería no pudo correrse: ${error.message}`);
  process.exit(1);
});
