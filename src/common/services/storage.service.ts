/**
 * Lo que el catálogo necesita de un almacenamiento de imágenes.
 *
 * Existe para poder cambiar de proveedor (Supabase Storage, Nhost Storage,
 * Appwrite Storage, cualquier otro que hable el mismo contrato) sin tocar
 * `ImagenService`: ese
 * servicio reserva cuota, sube, guarda la URL y libera la anterior, y delega
 * aquí el «dónde» y el «cómo».
 *
 * La implementación se elige al arrancar con `STORAGE_PROVIDER` (ver
 * `StorageModule`). El contrato es pequeño a propósito: subir un binario,
 * borrarlo, saber su URL pública y reconstruir su identificador desde esa URL.
 */
export interface StorageService {
  /**
   * Sube un binario y devuelve el identificador con el que luego se podrá
   * borrar. En Supabase es la ruta dentro del bucket; en Nhost o Appwrite, el
   * id que el proveedor asigna al subir. El llamador solo tiene que devolverlo
   * tal cual a `eliminar()`.
   */
  subir(
    bucket: string,
    path: string,
    contenido: Buffer,
    contentType: string,
  ): Promise<string>;

  /** Borra uno o varios binarios. Si el bucket no existe, no es un fallo. */
  eliminar(bucket: string, paths: string[]): Promise<void>;

  /** URL pública y estable que se guarda en la fila (`imagen_url`). */
  getPublicUrl(bucket: string, path: string): string;

  /**
   * Reconstruye el identificador de `subir()` a partir de la URL guardada.
   * Devuelve `undefined` si la URL no pertenece a este proveedor (una imagen
   * heredada de Supabase, por ejemplo).
   */
  pathDesdeUrl(bucket: string, url: string): string | undefined;
}

/** Token de inyección: `@Inject(STORAGE_SERVICE)` en `ImagenService`. */
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
