import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Encargo as EncargoShape } from '../interfaces/catalogo.interfaces.js';
import { numericTransformer } from '../utils/numeric.transformer.js';
import { Dulce } from './dulce.entity.js';
import { ProductoModelo } from './producto-modelo.entity.js';
import { Pedido } from './pedido.entity.js';

@Entity('encargo')
export class Encargo implements EncargoShape {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * `RESTRICT`, no `CASCADE`.
   *
   * Con `CASCADE`, borrar un dulce del catálogo arrastraba los renglones de
   * todos los pedidos que lo habían pedido: el pedido se quedaba con su
   * `precio_total` guardado y sin los renglones que lo compone, o sea un total
   * que ya no cuadra con nada y sin forma de saber qué se pidió. Ese borrado en
   * cascada no se notaba porque hasta ahora no existía ninguna forma de borrar
   * un dulce; `DELETE /delys/dulces/:id` lo hace posible.
   *
   * Con `RESTRICT` la base de datos se niega, y
   * `CatalogoService.eliminarDulce()` convierte el error en un `409` que dice
   * cuántos pedidos lo bloquean. Un dulce se puede borrar siempre que sus
   * pedidos estén resueltos.
   */
  @ManyToOne(() => Dulce, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'dulce_id' })
  dulce: Dulce;

  @Column({ type: 'int' })
  cantidad: number;

  /**
   * Qué **modelo** de la publicación se llevaron, o null.
   *
   * `RESTRICT`, por el mismo motivo que `dulce_id` arriba: borrar el modelo
   * dejaría al pedido nombrando algo que ya no existe. `ModelosService.eliminar()`
   * convierte el rechazo de la base de datos en un `409` que dice cuántos pedidos
   * lo bloquean.
   *
   * Es nullable porque los modelos llegaron después: los renglones viejos siguen
   * apuntando solo a la publicación, y nadie sabe qué modelo fue, así que no se
   * rellenan con una suposición.
   */
  @Column({ type: 'int', nullable: true, name: 'modelo_id' })
  modelo_id: number | null;

  @ManyToOne(() => ProductoModelo, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'modelo_id' })
  modelo: ProductoModelo | null;

  /**
   * El renglón **escrito**, no una lectura del catálogo: `Nevera No Frost 250 L —
   * 240 L inverter`. Se guarda aquí para que renombrar o bajar una publicación no
   * reescriba la historia de lo que ya se entregó, igual que una factura.
   *
   * 200 letras porque es el nombre de la publicación (120) más el del modelo
   * (120) con su guion; si alguna vez no cabe, se corta al escribir, no al leer.
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  nombre_vendido: string | null;

  /**
   * Precio unitario de aquel día. `precio_total` del pedido es lo que se cobró;
   * sin este dato no se puede rehacer la cuenta de un pedido viejo cuando el
   * catálogo cambia de precios.
   */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  precio_vendido: number | null;

  @ManyToOne(() => Pedido, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'pedido_id' })
  pedido: Pedido;
}