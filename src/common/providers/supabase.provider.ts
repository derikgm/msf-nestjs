import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Crea el cliente de Supabase Storage leyendo la configuración.
 *
 * Se llama en el primer uso y no al arrancar: así el servidor levanta aunque
 * falten SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY y solo fallen las subidas de
 * imagen, que es donde hacen falta.
 */
export function crearSupabaseClient(config: ConfigService): SupabaseClient {
  const url = config.get<string>('SUPABASE_URL');
  const key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key || url.includes('tu-proyecto') || key.includes('pon-aqui')) {
    throw new ServiceUnavailableException(
      'Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el .env (o siguen con el valor de ejemplo)',
    );
  }

  return createClient(url, key);
}
