import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../utils/numeric.transformer.js';
import { Instalacion as InstalacionShape } from '../interfaces/instalaciones-combos.interfaces.js';

/**
 * Servicios de instalación de ADC (punto 3 de todo.md): paneles solares,
 * Ecoflow, baterías… que el panel da de alta y la web pública pinta como
 * tarjetas.
 *
 * La tabla es **propia de ADC** (`adc_instalaciones`) y no comparte la columna
 * `negocio` con el catálogo: a diferencia de `producto` y `pedido` —que son la
 * misma cosa en los dos negocios—, una instalación no se parece a un combo de
 * Delys (aquí la "descripción" es una lista de textos; allí, una lista de
 * dulces con cantidad). Meterlas en una tabla común obligaría a columnas
 * mutuamente nulas, así que el enunciado pide tabla aparte y aquí se sigue.
 */
@Entity('adc_instalaciones')
export class Instalacion implements InstalacionShape {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre_servicio: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  precio: number;

  @Column({ type: 'varchar', length: 8, default: 'CUP' })
  moneda: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imagen_url: string | null;

  /**
   * Tamaño del archivo en Storage, igual que en `producto`: se guarda para
   * poder devolver la cuota al borrar la imagen (la cuota es un contador, no se
   * puede recalcular).
   */
  @Column({ type: 'int', nullable: true })
  imagen_bytes: number | null;

  /**
   * Líneas de la descripción, en `text[]` de Postgres. El panel las manda como
   * lista y así se devuelven; el `default '{}'` deja las filas sin descripción.
   */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  descripcion: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
