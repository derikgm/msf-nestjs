import { ConfigService } from '@nestjs/config';

/**
 * Lee una variable de entorno obligatoria y falla al arrancar si no está,
 * en lugar de dejarlo para un error críptico en la primera petición.
 */
export function requireEnv(config: ConfigService, key: string): string {
  const value = config.get<string>(key);

  if (!value) {
    throw new Error(`Falta la variable de entorno ${key}. Revisa tu archivo .env`);
  }

  return value;
}
