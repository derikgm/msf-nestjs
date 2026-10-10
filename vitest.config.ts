import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Tests de contrato de la API (X-5 / N-23): se montan los controladores con
 * servicios mockeados, sin base de datos viva. Los ficheros de `test/` no
 * entran en `npm run build` (`tsconfig.build.json` los excluye).
 *
 * `unplugin-swc` es obligatorio: Nest inyecta por `emitDecoratorMetadata`, y
 * esbuild (el transpilador que usa vite por defecto) no la emite; sin ella
 * los guards y controladores llegan con sus dependencias como `undefined`
 * (`this.reflector` etc.) y todo responde 500.
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
  },
});