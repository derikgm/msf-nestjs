import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Secciones de navegación del catálogo de **cada negocio** (punto de secciones).
 *
 * Igual que `producto` y `pedido`, la tabla es compartida y la separación entre
 * negocios va en la columna `negocio`: la pastelería tiene su sección "dulces"
 * (donde vive todo su catálogo heredado), y ADC define las suyas (`electronico`,
 * `ropa`, ...) desde su panel.
 *
 * `producto.seccion_id` apunta aquí con una FK: una sección que ya tiene
 * productos no se puede borrar sin llevar a la columna a un estado inconsistente
 * (la FK lo impide a nivel de base; el endpoint de borrado, cuando exista, lo
 * tiene que avisar antes).
 */
@Entity('seccion')
@Unique(['negocio', 'nombre'])
export class Seccion {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /** Nombre en minúsculas: `dulces`, `electronico`, `ropa`… `dulces` es la sección especial del catálogo heredado. */
  @Column({ type: 'varchar', length: 60 })
  nombre: string;

  /** De quién es la sección: `delys`, `adc`… (mismo criterio que `producto.negocio`). */
  @Column({ type: 'varchar', length: 16, default: 'delys' })
  negocio: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}