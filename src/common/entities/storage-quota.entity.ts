import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../utils/numeric.transformer.js';

/** 20 MB: cuota por defecto de cada proyecto. */
export const LIMITE_BYTES_POR_DEFECTO = 20 * 1024 * 1024;

/**
 * La cuota es POR ROL (por proyecto), no por usuario: los usuarios con rol "delys"
 * la comparten entre todos. Para un proyecto nuevo ("delys-domicilio") basta con
 * crear un registro con su propio limite_bytes y reutilizar toda la lógica.
 */
@Entity('storage_quota')
export class StorageQuota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  rol: string;

  /** Postgres devuelve los bigint como string: el transformer los deja en number. */
  @Column({ type: 'bigint', default: 0, transformer: numericTransformer })
  bytes_usados: number;

  @Column({
    type: 'bigint',
    default: LIMITE_BYTES_POR_DEFECTO,
    transformer: numericTransformer,
  })
  limite_bytes: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
