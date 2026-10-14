import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
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
 * Aquí `Combo` sí se importa **como valor**, que es lo que necesita la flecha
 * `() => Combo`. Es seguro porque el otro lado (`combo.entity.ts`) apunta a esta
 * clase **por nombre** (`@OneToMany('ComboDulce', …)`): no hay importación de
 * ida y vuelta en el JS compilado y `Combo` no se toca antes de inicializarse.
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
