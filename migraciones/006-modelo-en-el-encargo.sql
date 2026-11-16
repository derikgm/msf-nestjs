-- 006 · El renglón de pedido recuerda qué modelo llevaron
--
-- Desde que una publicación puede venderse en varios modelos (`producto_modelo`,
-- ver 005), `encargo.producto` se queda corto: dice «la nevera de la publicación
-- 5» pero no si fue la de 240 L o la de 420 L. Y el catálogo se puede renombrar
-- o repricear, así que el pedido tampoco puede reconstruirse leyéndolo: lleva
-- escrito cómo se vendió aquel día.
--
--   modelo_id      -> qué modelo exacto (FK con RESTRICT, como dulce_id)
--   nombre_vendido -> «Nevera No Frost 250 L — 240 L inverter», congelado
--   precio_vendido -> precio unitario de aquel día
--
-- Las tres son nullables: los renglones ya creados no saben qué modelo fue y no
-- se rellenan con una suposición. Es el espejo en SQL de
-- `src/migraciones/1791900000040-PedidoRecuerdaElModelo.ts`, que el servidor
-- aplica solo al arrancar (`migrationsRun: true`, `synchronize: false`). Sirve
-- para tocar producción a mano sin desplegar código nuevo.
--
-- Idempotente: se puede aplicar más de una vez. No borra nada.

-- ────────────────────────────────────────────────────────────────────────────
-- 1 · Las tres columnas. `ADD COLUMN IF NOT EXISTS` deja pasar la segunda
--     pasada, que es lo que se quiere cuando el servidor ya la aplicó.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE encargo ADD COLUMN IF NOT EXISTS modelo_id integer;
ALTER TABLE encargo ADD COLUMN IF NOT EXISTS nombre_vendido varchar(200);
ALTER TABLE encargo ADD COLUMN IF NOT EXISTS precio_vendido numeric(12,2);

-- ────────────────────────────────────────────────────────────────────────────
-- 2 · La FK, con el mismo criterio que `encargo.dulce_id`: RESTRICT y no
--     CASCADE. Borrar un modelo que está en un pedido dejaría al pedido
--     nombrando algo que ya no existe, y `precio_total` ya no cuadraría con
--     nada. `ModelosService.eliminar()` lo traduce en un 409 que dice cuántos
--     pedidos lo bloquean; la restricción está aquí para que el error no se
--     cuele como un 500 si alguien borra por debajo.
--
--     `ADD CONSTRAINT` no tiene `IF NOT EXISTS`, así que se pregunta en
--     `pg_constraint` (igual que en 005).
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_encargo_modelo'
  ) THEN
    ALTER TABLE encargo
      ADD CONSTRAINT FK_encargo_modelo
      FOREIGN KEY (modelo_id) REFERENCES producto_modelo (id)
      ON DELETE RESTRICT;
  END IF;
END $$;
