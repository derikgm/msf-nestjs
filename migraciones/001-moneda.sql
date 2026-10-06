-- 001 · moneda en el catálogo (puntos 5, 5.1 y 5.2 de msf-app/todo.md)
--
-- Idempotente: se puede ejecutar tantas veces como haga falta.
--
-- IMPORTANTE sobre el orden: el servidor va con `synchronize: true`, así que la
-- versión desplegada ahora mismo **borra** esta columna al arrancar si su
-- entidad aún no la conoce (lo hemos visto: la columna aparecía y desaparecía
-- al enfriarse/refrescarse Wasmer). Por eso el SQL se ejecuta **junto con** el
-- despliegue de este código, no antes. Si se pierde, el propio `synchronize`
-- del código nuevo la vuelve a crear con el mismo `DEFAULT 'CUP'`, así que los
-- datos no corren peligro: solo hay que desplegar.

-- 5 · La columna. `varchar`, no booleano ni enum, para que en el futuro quepan
-- más monedas sin tocar la base ni el servidor. 8 bastan: CUP, USD, EUR, CNY,
-- MLC, STD.
ALTER TABLE dulce
  ADD COLUMN IF NOT EXISTS moneda varchar(8) NOT NULL DEFAULT 'CUP';

-- 5.1 · Los datos que ya existían pasan a CUP. El DEFAULT ya los rellenó al
-- añadir la columna; el UPDATE deja la intención escrita y cubre cualquier fila
-- que haya quedado vacía por el motivo que sea.
UPDATE dulce
   SET moneda = 'CUP'
 WHERE moneda IS NULL OR btrim(moneda) = '';

-- Comprobación esperada (todo debe salir en 'CUP'):
--   SELECT id, nombre, precio, moneda FROM dulce;
