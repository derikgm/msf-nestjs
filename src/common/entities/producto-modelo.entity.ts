import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { numericTransformer } from '../utils/numeric.transformer.js';
import { ProductoModelo as ProductoModeloShape } from '../interfaces/catalogo.interfaces.js';
import { Dulce } from './dulce.entity.js';

/**
 * Un **modelo** de una publicación (`producto_modelo`), para catálogos tipo
 * Amazon: una sola publicación («Nevera inverter») que se vende en varios
 * modelos con características distintas —peso, capacidad, voltaje—, cada uno
 * con su precio, su foto y su ficha.
 *
 * `producto` guarda lo común a todos (nombre de la publicación, descripción
 * larga, sección, foto de portada) y esta tabla lo que cambia entre modelos.
 * Un producto **sin modelos** se sigue vendiendo exactamente como antes: los
 * modelos son opcionales y el catálogo heredado no se toca.
 *
 * No hay columna `negocio`: el modelo pertenece a un `producto`, y ese producto
 * ya es de uno solo. Añadir `negocio` aquí permitiría un modelo de ADC colgado
 * de un dulce de Delys; sin la columna, es imposible que se desincronice.
 *
 * Los `atributos` van en `jsonb` y no en una tabla `atributo` con filas
 * clave/valor: nadie filtra ni ordena por «Peso» (se ordena por precio, que sí
 * es columna), y así entra una característica nueva sin migración ni código
 * nuevo. El `UNIQUE(producto_id, nombre)` es la misma idea que
 * `UNIQUE(negocio, nombre)` de `seccion`: dentro de una publicación no puede
 * haber dos modelos que se llamen igual.
 */
@Entity('producto_modelo')
@Unique(['producto_id', 'nombre'])
export class ProductoModelo implements ProductoModeloShape {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Publicación a la que pertenece. `onDelete: 'CASCADE'`: si se borra la
   * publicación se van sus modelos, igual que los renglones de un combo
   * (`delys_combo_dulces`) se van con el combo.
   */
  @Column({ type: 'int', name: 'producto_id' })
  producto_id: number;

  @ManyToOne(() => Dulce, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto: Dulce;

  /** Nombre corto del modelo: `240 L inverter`, `12 V / 100 Ah`… */
  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  /**
   * Precio **del modelo**. Si la publicación lo tiene, se usa como precio base
   * «desde …» en las tarjetas; el precio real de lo que se lleva el cliente es
   * siempre el del modelo elegido.
   */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  precio: number;

  /** Mismo criterio que `producto.moneda`: texto libre, no enum. */
  @Column({ type: 'varchar', length: 8, default: 'CUP' })
  moneda: string;

  /** Foto del modelo; null si todavía no tiene (la web cae a la de la publicación). */
  @Column({ type: 'varchar', length: 500, nullable: true })
  imagen_url: string | null;

  /**
   * Tamaño del archivo en Storage, como en `producto`: se guarda para poder
   * devolver la cuota al borrar la imagen (la cuota es un contador, no se
   * puede recalcular).
   */
  @Column({ type: 'int', nullable: true })
  imagen_bytes: number | null;

  /**
   * Ficha técnica como pares `etiqueta: valor` (`{ "Peso": "38 kg" }`).
   * `NOT NULL DEFAULT '{}'`: una fila sin características es `{}`, nunca null,
   * para que la web no tenga que comprobarlo.
   */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  atributos: Record<string, string>;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
