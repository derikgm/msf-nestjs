import { PartialType } from '@nestjs/mapped-types';
import { CreateInstalacionDto } from './create-instalacion.dto.js';

/**
 * Edición parcial de una instalación: se manda solo lo que cambia y
 * `PartialType` replica `CreateInstalacionDto` con todo opcional y sus mismos
 * validadores.
 *
 * La imagen no pasa por aquí: tiene sus propias rutas porque viaja como
 * `multipart/form-data` a Supabase Storage, no en el cuerpo JSON.
 */
export class UpdateInstalacionDto extends PartialType(CreateInstalacionDto) {}
