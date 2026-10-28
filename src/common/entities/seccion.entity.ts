import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
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
 * Soporta **categorías y subcategorías**: una sección puede tener `parent_id`
 * apuntando a otra sección del mismo negocio. Las categorías raíz (`parent_id`
 * null) agrupan subcategorías; los productos se asignan a la sección/subcategoría
 * final mediante `producto.seccion_id`.
 */
@Entity('seccion')
@Unique(['negocio', 'nombre', 'parent_id'])
export class Seccion {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /** Nombre en minúsculas: `dulces`, `electronico`, `ropa`… `dulces` es la sección especial del catálogo heredado. */
  @Column({ type: 'varchar', length: 60 })
  nombre: string;

  /** De quién es la sección: `delys`, `adc`… (mismo criterio que `producto.negocio`). */
  @Column({ type: 'varchar', length: 16, default: 'delys' })
  negocio: string;

  @Column({ type: 'int', nullable: true, name: 'parent_id' })
  parent_id: number | null;

  @ManyToOne(() => Seccion, (seccion) => seccion.hijos, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  padre: Seccion | null;

  @OneToMany(() => Seccion, (seccion) => seccion.padre)
  hijos: Seccion[];

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}