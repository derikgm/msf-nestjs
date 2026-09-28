import { Column, Entity, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer.js';
import { Dulce as DulceShape } from '../interfaces/delys.interfaces.js';

@Entity('dulce')
export class Dulce implements DulceShape {
  /** El id lo define el catálogo (ver data/ofertas.ts), no la base de datos. */
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  precio: number;
}
