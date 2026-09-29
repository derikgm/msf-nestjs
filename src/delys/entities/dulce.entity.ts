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

  @Column({ type: 'varchar', length: 500, nullable: true })
  imagen_url: string | null;

  /**
   * Tamaño del archivo en Storage. Se guarda para poder liberar la cuota al borrar
   * la imagen, porque la cuota es un contador, no se puede recalcular.
   */
  @Column({ type: 'int', nullable: true })
  imagen_bytes: number | null;
}
