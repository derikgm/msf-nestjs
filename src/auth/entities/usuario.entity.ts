import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Cada rol es un proyecto y tiene su propia cuota de almacenamiento: los usuarios
 * con rol "delys" (la propietaria y su familia) comparten la misma cuota, y los de
 * "domus" la suya. Para un proyecto nuevo ("delys-domicilio") basta con usar el
 * nombre como rol: la columna es varchar para no requerir migraciones.
 */
export const ROLES = ['delys', 'domus'] as const;

export type RolUsuario = (typeof ROLES)[number];

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  /** Nombre con el que se inicia sesión. Se guarda siempre en minúsculas. */
  @Column({ type: 'varchar', length: 60, unique: true })
  usuario: string;

  /**
   * `select: false` lo esconde de todas las consultas: para leerlo hay que
   * pedirlo explícitamente con addSelect, así el hash nunca sale por accidente.
   */
  @Column({ type: 'varchar', length: 200, select: false })
  password_hash: string;

  @Column({ type: 'varchar', length: 50, default: 'delys' })
  rol: RolUsuario;

  /** Permite quitarle el acceso sin borrar su historial. */
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
