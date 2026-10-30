import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Secciones de navegación del catálogo de **cada negocio** (punto de secciones).
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

  @Column({ type: 'int', nullable: true, name: 'parent_id', default: null })
  parent_id?: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
