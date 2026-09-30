import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Encargo as EncargoShape } from '../interfaces/delys.interfaces.js';
import { Dulce } from './dulce.entity.js';
import { Pedido } from './pedido.entity.js';

@Entity('encargo')
export class Encargo implements EncargoShape {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Dulce, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'dulce_id' })
  dulce: Dulce;

  @Column({ type: 'int' })
  cantidad: number;

  @ManyToOne(() => Pedido, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'pedido_id' })
  pedido: Pedido;
}
