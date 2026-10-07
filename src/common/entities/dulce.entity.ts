import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../utils/numeric.transformer.js';
import { Dulce as DulceShape } from '../interfaces/catalogo.interfaces.js';
import { Seccion } from './seccion.entity.js';

/**
 * Un producto del catálogo, **de cualquier negocio**. La tabla se llamaba
 * `dulce` y pasó a `producto` porque ahora también vende ADC (punto 6 de
 * msf-app/todo.md): el nombre lo pide el enunciado, y los endpoints
 * `/delys/dulces` siguen llamándose como estaban.
 */
@Entity('producto')
export class Dulce implements DulceShape {
  /** El id lo define el catálogo (ver data/ofertas.ts), no la base de datos. */
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  precio: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imagen_url: string | null;

  /**
   * Tamaño del archivo en Storage. Se guarda para poder liberar la cuota al borrar
   * la imagen, porque la cuota es un contador, no se puede recalcular.
   */
  @Column({ type: 'int', nullable: true })
  imagen_bytes: number | null;

  /**
   * Moneda en la que se entiende `precio`. **Texto (máx. 8), no booleano ni
   * enum**: así en el futuro caben más monedas sin tocar ni la base ni el
   * servidor (punto 5 de msf-app/todo.md).
   *
   * `default: 'CUP'` es el punto 5.1: al añadir la columna, Postgres rellena
   * con `CUP` las filas que ya existían, así que los datos viejos quedan en
   * pesos cubanos sin recorrerlos a mano.
   */
  @Column({ type: 'varchar', length: 8, default: 'CUP' })
  moneda: string;

  /**
   * De quién es: `delys`, `adc`… **Texto y no enum** (igual que `moneda`), para
   * que abrir un negocio nuevo no lleve migración. **Por este campo se filtra
   * todo**: sin él, el catálogo de Delys vería los productos de ADC y los dos
   * paneles se pisarían. El `default: 'delys'` es lo que quedan las filas que
   * ya existían cuando se creó la columna.
   */
  @Column({ type: 'varchar', length: 16, default: 'delys' })
  negocio: string;

  /**
   * A qué sección del catálogo pertenece (`seccion.id`), o null. La columna está
   * declarada aquí y el `ManyToOne` apunta a la misma `.seccion_id`: así el
   * `Dulce` expone el id como campo y la relación para leerla, sin duplicados.
   * Nullable a propósito: los productos que existían antes de las secciones se
   * asignan a la sección `dulces` de su negocio al arrancar
   * (`CatalogoService.asignarSeccionDulces()`), así que solo puede ser null
   * mientras no haya hecho esa pasada.
   */
  @Column({ type: 'int', nullable: true, name: 'seccion_id' })
  seccion_id: number | null;

  @ManyToOne(() => Seccion, { nullable: true })
  @JoinColumn({ name: 'seccion_id' })
  seccion: Seccion | null;
}