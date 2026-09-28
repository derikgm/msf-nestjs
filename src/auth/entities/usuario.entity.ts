import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const ROLES = ['admin', 'operador'] as const;

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

  @Column({ type: 'enum', enum: ROLES, default: 'operador' })
  rol: RolUsuario;

  /** Permite quitarle el acceso sin borrar su historial. */
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
