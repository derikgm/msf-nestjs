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
 *
 * "admin" es la excepción: administra la plataforma y entra a cualquier ruta con
 * `@Roles()` (ver RolesGuard). El resto de roles solo ven lo de su propio proyecto.
 */
export const ROLES = ['delys', 'domus', 'adc', 'admin'] as const;

export type RolUsuario = (typeof ROLES)[number];

/** Único rol con paso libre: es administración de la plataforma, no un proyecto. */
export const ROL_SUPERUSUARIO: RolUsuario = 'admin';

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
