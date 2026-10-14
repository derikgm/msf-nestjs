/**
 * Guarda contra el ciclo de importaciones que tumbaba el arranque.
 *
 * `Combo` y `ComboDulce` se apuntan mutuamente. Con `emitDecoratorMetadata`,
 * `combo: Combo` en `ComboDulce` emitía `__metadata("design:type", Combo)` y,
 * como `Combo` importaba `ComboDulce` **como valor**, en ESM se accedía a
 * `Combo` antes de inicializarse:
 *
 *   ReferenceError: Cannot access 'Combo' before initialization
 *
 * y el servidor moría al arrancar (500 en Wasmer). El `test/contrato.spec.ts`
 * no lo veía porque monta controladores con servicios mockeados y nunca carga
 * las entidades.
 *
 * OJO: un test que solo importe las entidades **no** reproduce el fallo bajo
 * Vitest, porque transforma los módulos de otra forma que el ESM de Node que
 * corre en producción. Por eso la comprobación de verdad es estructural: el
 * lado «uno» (`combo.entity.ts`) tiene que apuntar a la otra entidad **por
 * nombre** (`@OneToMany('ComboDulce', …)`) e importarla con `import type`, que
 * es lo que evita la importación real en el JS compilado (igual que
 * `Pedido`/`Encargo`).
 */
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';

import * as entidades from '../src/common/entities/index.js';

function fuenteDe(archivo: string): string {
  return readFileSync(new URL(`../src/common/entities/${archivo}`, import.meta.url), 'utf8');
}

describe('entidades', () => {
  it('declaran las tablas del punto 3', () => {
    const tablas = getMetadataArgsStorage().tables.map((tabla) => tabla.name);

    expect(tablas).toContain('delys_combos');
    expect(tablas).toContain('delys_combo_dulces');
    expect(tablas).toContain('adc_instalaciones');
  });

  it('Combo apunta a ComboDulce por nombre y no la importa como valor', () => {
    const combo = fuenteDe('combo.entity.ts');

    // El lado «uno» se queda con la flecha por nombre de entidad…
    expect(combo).toContain("@OneToMany('ComboDulce'");
    // …nada de `() => ComboDulce`, que volvería a meter la importación real.
    expect(combo).not.toMatch(/@OneToMany\(\(\) => ComboDulce/);
    // …y la entidad entra solo como tipo.
    expect(combo).toMatch(
      /import type \{[^}]*ComboDulce[^}]*\} from '\.\/combo-dulce\.entity\.js'/,
    );
    // La flecha sigue existiendo para que TypeORM lea los metadatos.
    expect(entidades.Combo).toBeTypeOf('function');
  });
});
