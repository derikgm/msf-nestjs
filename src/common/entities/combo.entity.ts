import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../utils/numeric.transformer.js';
import { Combo as ComboShape } from '../interfaces/instalaciones-combos.interfaces.js';
import { ComboDulce } from './combo-dulce.entity.js';

/**
 * Una oferta de Delys (punto 3 de todo.md): varios dulces juntos por un precio,
 * que el panel da de alta y la web pública pinta como tarjetas.
 *
 * Tabla **propia de Delys** (`delys_combos`), no compartida por la columna
 * `negocio` con el catálogo: un combo no tiene el mismo cuerpo que un producto
 * (lleva una lista de dulces) ni que una instalación de ADC. Los dulces viven en
 * `delys_combo_dulces` y se cargan con la relación.
 */
@Entity('delys_combos')
export class Combo implements ComboShape {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre_combo: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  precio: number;

  @Column({ type: 'varchar', length: 8, default: 'CUP' })
  moneda: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imagen_url: string | null;

  /** Tamaño del archivo en Storage, para poder liberar la cuota al borrar. */
  @Column({ type: 'int', nullable: true })
  imagen_bytes: number | null;

  /**
   * Los dulces del combo. `cascade: true` deja que `save()` inserte los
   * renglones nuevos de una vez; el `Combo` los administra (el servicio los
   * reemplaza enteros cuando se edita el combo).
   */
  @OneToMany(() => ComboDulce, (dulce) => dulce.combo, { cascade: true })
  dulces: ComboDulce[];

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
