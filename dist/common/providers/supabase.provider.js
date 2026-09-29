import { createClient } from '@supabase/supabase-js';
import { ServiceUnavailableException } from '@nestjs/common';
export function crearSupabaseClient(config) {
    const url = config.get('SUPABASE_URL');
    const key = config.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key || url.includes('tu-proyecto') || key.includes('pon-aqui')) {
        throw new ServiceUnavailableException('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el .env (o siguen con el valor de ejemplo)');
    }
    return createClient(url, key);
}
//# sourceMappingURL=supabase.provider.js.map