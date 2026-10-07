import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Encargo as EncargoShape } from '../interfaces/catalogo.interfaces.js';
import { Dulce } from './dulce.entity.js';
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

  @ManyToOne(() => Pedido, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'pedido_id' })
  pedido: Pedido;
}