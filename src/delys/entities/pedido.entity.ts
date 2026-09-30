import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer.js';
import { Encargo, Pedido as PedidoShape } from '../interfaces/delys.interfaces.js';
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
   * Los datos de entrega.
   *
   * `direccion`, `telefono`, `fecha` y `horario` son obligatorios en el modelo, pero
   * las columnas admiten null a propósito: `synchronize: true` no puede añadir una
   * columna NOT NULL a una tabla que ya tiene filas, y falla con
   * `column "direccion" of relation "pedido" contains null values`. Con las columnas
   * permeables la app arranca siempre.
   *
   * Lo que sí los hace obligatorios es `CreatePedidoDto`: no hay forma de crear un
   * pedido sin ellos. Cuando se escriban las migraciones y se vacíe la tabla, estas
   * cuatro vuelven a ser NOT NULL.
   */

  /** Dónde se entrega. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  direccion: string | null;

  /** Teléfono de contacto para la entrega. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string | null;

  /**
   * Solo el día de la entrega, en `YYYY-MM-DD`. La hora va en `horario`, así que la
   * columna es `date` y no `timestamptz`: guardar la medianoche como timestamp sería
   * un dato falso, porque el pedido se entrega a cierta hora, no a las 00:00.
   * TypeORM devuelve y escribe este tipo como texto.
   */
  @Column({ type: 'date', nullable: true })
  fecha: string | null;

  /** Franja horaria de entrega, tal como la escribió el cliente. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  horario: string | null;

  /** Indicaciones del pedido: opcional, así que null es su valor normal. */
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