import { type SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
export declare function crearSupabaseClient(config: ConfigService): SupabaseClient;
