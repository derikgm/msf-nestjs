import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
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
 * **Subcategorías** (punto de subcategorías): `padre_id` apunta a otra fila de
 * esta misma tabla. `NULL` es una categoría principal; con valor es una
 * subcategoría de esa categoría. El árbol es de **un solo nivel** (una
 * subcategoría no puede tener subcategorías): lo valida el servicio, porque la
 * base por sí sola no lo puede impedir con una FK.
 *
 * `producto.seccion_id` apunta aquí con una FK: una sección que ya tiene
 * productos no se puede borrar sin llevar a la columna a un estado inconsistente
 * (la FK lo impide a nivel de base; el endpoint de borrado lo avisa antes).
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

  /**
   * Categoría a la que pertenece esta sección, o `NULL` si es principal.
   *
   * La columna está declarada aquí y el `ManyToOne` apunta a la misma
   * `padre_id`: así la entidad expone el id como campo y la relación para
   * leerla, igual que `producto.seccion_id` (ver `Dulce`).
   */
  @Column({ type: 'int', nullable: true, name: 'padre_id' })
  padre_id: number | null;

  @ManyToOne(() => Seccion, { nullable: true })
  @JoinColumn({ name: 'padre_id' })
  padre: Seccion | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
