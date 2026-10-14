import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DulceCombo as DulceComboShape } from '../interfaces/instalaciones-combos.interfaces.js';
import { Combo } from './combo.entity.js';

/**
 * Un renglón de un combo (`delys_combo_dulces`): el nombre del dulce y cuántas
 * unidades lleva.
 *
 * Guarda el **nombre**, no una FK a `producto`: el combo puede llevar dulces
 * del catálogo o escritos a mano (que no se dan de alta), y así borrar un dulce
 * no rompe los combos que lo nombran. El `onDelete: 'CASCADE'` es solo respecto
 * al combo: si el combo se borra, sus renglones se van con él.
 *
 * La relación se declara con flecha perezosa (`() => Combo`) porque `Combo`
 * también nombra a esta clase: la flecha se evalúa cuando TypeORM lee los
 * metadatos, no al cargar el módulo.
 */
@Entity('delys_combo_dulces')
export class ComboDulce implements DulceComboShape {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre_dulce: string;

  @Column({ type: 'int' })
  cantidad: number;

  @ManyToOne(() => Combo, (combo) => combo.dulces, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'combo_id' })
  combo: Combo;
}
