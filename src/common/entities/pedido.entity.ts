import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../utils/numeric.transformer.js';
import { Encargo, Pedido as PedidoShape } from '../interfaces/catalogo.interfaces.js';
import type { Encargo as EncargoEntity } from './encargo.entity.js';

@Entity('pedido')
export class Pedido implements PedidoShape {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  precio_total: number;

  /**
   * De quién es el pedido: `delys` o `adc` (punto 6). El `encargo` **no** lo
   * lleva: es un renglón de este pedido y su negocio se deduce de aquí, así que
   * no hay que tocar su FK. `default: 'delys'` para los pedidos existentes.
   */
  @Column({ type: 'varchar', length: 16, default: 'delys' })
  negocio: string;

  /**
   * Los datos de entrega.
 *
   * `direccion`, `telefono` y `fecha` son obligatorios en el modelo, pero las
   * columnas admiten null a propósito: `synchronize: true` no puede añadir una
   * columna NOT NULL a una tabla que ya tiene filas, y falla con
   * `column "direccion" of relation "pedido" contains null values`. Con las columnas
   * permeables la app arranca siempre.
   *
   * Lo que sí los hace obligatorios es `CreatePedidoDto`: no hay forma de crear un
   * pedido sin ellos. Cuando se escriban las migraciones y se vacíe la tabla, estas
   * tres vuelven a ser NOT NULL.
   */

  /** Dónde se entrega. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  direccion: string | null;

  /** Teléfono de contacto para la entrega. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string | null;

  /**
   * Solo el día de la entrega, en `YYYY-MM-DD`. No lleva hora: el cliente no pide
   * franja horaria, así que guardar la medianoche como timestamp sería un dato
   * falso. TypeORM devuelve y escribe este tipo como texto.
   */
  @Column({ type: 'date', nullable: true })
  fecha: string | null;

  /** Indicaciones del pedido: es opcional, por eso admite null. */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  notas: string | null;

  /**
   * La relación apunta por nombre de entidad y la propiedad se tipa con la interfaz
   * del dominio, para que Pedido y Encargo no se importen en ciclo: con
   * emitDecoratorMetadata un ciclo entre entidades rompe el arranque.
   * `cascade` guarda el pedido y sus encargos en una sola operación.
   */
  @OneToMany('Encargo', (encargo: EncargoEntity) => encargo.pedido, { cascade: true })
  encargos: Encargo[];
}