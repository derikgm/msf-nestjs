import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
export const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024;
export const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export function interceptorDeImagen(campo = 'imagen') {
    return FileInterceptor(campo, {
        limits: { fileSize: TAMANO_MAXIMO_ARCHIVO, files: 1 },
        fileFilter: (_req, file, callback) => {
            if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
                return callback(new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}. Usa ${TIPOS_PERMITIDOS.join(', ')}`), false);
            }
            return callback(null, true);
        },
    });
}
//# sourceMappingURL=imagen.archivo.js.map