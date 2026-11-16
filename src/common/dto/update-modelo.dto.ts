import { PartialType } from '@nestjs/mapped-types';
import { CreateModeloDto } from './create-modelo.dto.js';

/**
 * Edición parcial de un modelo: se manda solo lo que cambia y `PartialType`
 * replica `CreateModeloDto` con todo opcional y sus mismos validadores.
 *
 * No hay `producto_id` ni aquí ni en el alta: un modelo no se muda de
 * publicación. Si el dueño se equivocó de producto, se borra y se crea en el
 * correcto — así no hay forma de que un modelo acabe colgado de una publicación
 * de otro negocio.
 *
 * La foto tampoco pasa por aquí: tiene sus propias rutas porque viaja como
 * `multipart/form-data` a Supabase Storage, no en el cuerpo JSON.
 */
export class UpdateModeloDto extends PartialType(CreateModeloDto) {}
