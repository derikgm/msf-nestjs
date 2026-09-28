import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta como accesible sin token. El JwtAuthGuard es global, así que
 * todo lo que no lleve este decorador exige autenticación.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
