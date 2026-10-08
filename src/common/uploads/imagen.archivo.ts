import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

/**
 * Constantes y decorador compartidos por las rutas de imagen de Delys y ADC
 * (N-20). Antes estaban copiadas en `delys.controller.ts` y
 * `adc.controller.ts`; aquí viven una sola vez y los dos controladores las
 * reutilizan, así un cambio de tope o de tipos se hace en un sitio.
 */

/** Tope de transporte: el máximo por archivo del plan Free de Supabase Storage. */
export const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024;

export const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * FileInterceptor de imagen listo para `@UseInterceptors(...)`, con el tope de
 * tamaño y el filtro de tipos ya puestos.
 *
 * ```ts
 * @UseInterceptors(interceptorDeImagen('imagen'))
 * ```
 */
export function interceptorDeImagen(campo = 'imagen') {
  return FileInterceptor(campo, {
    limits: { fileSize: TAMANO_MAXIMO_ARCHIVO, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
        return callback(
          new BadRequestException(
            `Tipo de archivo no permitido: ${file.mimetype}. Usa ${TIPOS_PERMITIDOS.join(', ')}`,
          ),
          false,
        );
      }

      return callback(null, true);
    },
  });
}