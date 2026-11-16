import { PartialType } from '@nestjs/mapped-types';
import { CreateComboDto } from './create-combo.dto.js';

/**
 * Edición parcial de un combo: se manda solo lo que cambia y `PartialType`
 * replica `CreateComboDto` con todo opcional y sus mismos validadores. Si llega
 * `dulces`, el servicio **reemplaza** la lista entera, no la mezcla.
 *
 * La imagen no pasa por aquí: tiene sus propias rutas porque viaja como
 * `multipart/form-data` a Supabase Storage, no en el cuerpo JSON.
 */
export class UpdateComboDto extends PartialType(CreateComboDto) {}
