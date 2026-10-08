import { PartialType } from '@nestjs/mapped-types';
import { CreateDulceDto } from './create-dulce.dto.js';

/**
 * Edición parcial de un dulce: se manda solo lo que cambia, y `PartialType` ya
 * replica `CreateDulceDto` con todos los campos opcionales y sus decoradores de
 * validación (N-20: antes se copiaba campo a campo y cualquier cambio en el
 * alta había que repetirlo aquí).
 *
 * No pueden faltar los tres: `PATCH` sin nada que cambiar es un error del
 * cliente, no un no-op (lo comprueba `CatalogoService.actualizarDulce()`).
 *
 * La imagen no pasa por aquí. Tiene su propio par de rutas porque va como
 * `multipart/form-data` a Supabase Storage, no en el cuerpo JSON.
 */
export class UpdateDulceDto extends PartialType(CreateDulceDto) {}