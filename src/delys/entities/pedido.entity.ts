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
   * La relación apunta por nombre de entidad y la propiedad se tipa con la interfaz
   * del dominio, para que Pedido y Encargo no se importen en ciclo: con
   * emitDecoratorMetadata un ciclo entre entidades rompe el arranque.
   * `cascade` guarda el pedido y sus encargos en una sola operación.
   */
  @OneToMany('Encargo', (encargo: EncargoEntity) => encargo.pedido, { cascade: true })
  encargos: Encargo[];
}
