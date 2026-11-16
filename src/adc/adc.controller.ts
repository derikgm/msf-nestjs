import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { minutes, SkipThrottle, Throttle } from '@nestjs/throttler';
import { interceptorDeImagen } from '../common/uploads/imagen.archivo.js';
import { usuarioActual } from '../common/utils/auth.util.js';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService, type MulterFile } from '../common/services/dulce-imagen.service.js';
import { InstalacionesService } from '../common/services/instalaciones.service.js';
import { ModelosService } from '../common/services/modelos.service.js';
import type { DulcePublico, ProductoModelo } from '../common/interfaces/catalogo.interfaces.js';
import type { Instalacion as InstalacionShape } from '../common/interfaces/instalaciones-combos.interfaces.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreateInstalacionDto } from '../common/dto/create-instalacion.dto.js';
import { CreateModeloDto } from '../common/dto/create-modelo.dto.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import { UpdateInstalacionDto } from '../common/dto/update-instalacion.dto.js';
import { UpdateModeloDto } from '../common/dto/update-modelo.dto.js';
import { UpdateSeccionDto } from '../common/dto/update-seccion.dto.js';
import type { RequestConUsuario } from '../auth/auth.interfaces.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';

/**
 * Rutas de ADC: los propios endpoints de su negocio.
 *
 * 1. Se llaman `productos` y no `dulces`, tal como pide el enunciado del punto
 *    6 (`GET /adc/productos`). Los de Delys van en `/delys/dulces`.
 * 2. Lo de gestión exige el rol `adc` (y la ruta pública de pedido se abre
 *    igual que en Delys: quien pide paneles no tiene cuenta).
 *
 * **La lógica está compartida, no duplicada**: el controlador usa `CatalogoService`,
 * el servicio neutral del catálogo que comparte tabla, entidades y lógica entre
 * negocios. `AdcModule` lo monta con `CONFIG_ADC`, de modo que sus consultas
 * filtran por `negocio = 'adc'` y responden solo los productos de ADC (punto 6).
 *
 * Las claves de la respuesta hablan de `producto` (y no de `dulce`), que es el
 * idioma de este negocio: el servicio devuelve `dulce` porque así lo lee el
 * panel de Delys, y aquí se traducen.
 */
@Controller('adc')
export class AdcController {
  constructor(
    private readonly catalogo: CatalogoService,
    private readonly imagenService: DulceImagenService,
    private readonly instalaciones: InstalacionesService,
    private readonly modelos: ModelosService,
  ) {}

  // Catálogo: público, sin token, igual que la vitrina de Delys. Devuelve los
  // productos y sus secciones de navegación **tal cual están en este negocio**.
  //
  // Antes se quitaba de la respuesta todo lo llamado "dulces" (la sección del
  // catálogo heredado), pero la separación entre negocios es la columna
  // `negocio` y `obtenerTodosDulces()` ya filtra por la de ADC: ese filtro solo
  // conseguía esconder productos legítimos de ADC, los que se dan de alta sin
  // sección y acaban en esa sección por defecto (punto 2: con 4 creados solo se
  // veían 3). Ahora salen todos, y el panel permite reubicarlos.
  //
  // N-5: fuera del rate limit, igual que en Delys —un catálogo que se pinta
  // entero en cada visita no debe acabar en 429.
  @Public()
  @SkipThrottle()
  @Get('productos')
  async obtenerProductos() {
    const { dulces } = await this.catalogo.obtenerTodosDulces();
    const { secciones } = await this.catalogo.listarSecciones();
    // Los modelos de todas las publicaciones de una sola vez: si se pidieran
    // uno por uno, la vitrina necesitaría tantas consultas como productos (y en
    // un teléfono, tantas esperas). Una `IN` sobre los ids de esta página.
    const modelosPorProducto = await this.modelos.porPublicaciones(
      dulces.map((dulce) => dulce.id),
    );

    return {
      productos: dulces.map((dulce) => ({
        ...this.aProducto(dulce),
        // `[]` cuando la publicación se vende sin modelos: la web y el panel no
        // tienen que distinguir entre «sin modelos» y «no lo pregunté».
        modelos: (modelosPorProducto.get(dulce.id) ?? []).map((modelo) => this.aModelo(modelo)),
      })),
      secciones: secciones.map((seccion) => ({
        id: seccion.id,
        nombre: seccion.nombre,
        // Subcategorías: `null` es categoría principal y un id es la categoría
        // de la que cuelga. La web arma el árbol con esto.
        padre_id: seccion.padre_id ?? null,
      })),
    };
  }

  /**
   * El servicio habla de `dulce`; aquí cada uno se traduce a `producto` (ver la
   * cabecera de la clase). La sección se enseña como **nombre** (no como
   * objeto), igual que en `GET /adc/productos` (N-15).
   */
  private aProducto(dulce: DulcePublico) {
    return {
      id: dulce.id,
      nombre: dulce.nombre,
      precio: dulce.precio,
      moneda: dulce.moneda,
      imagen_url: dulce.imagen_url,
      descripcion: dulce.descripcion,
      seccion_id: dulce.seccion_id,
      seccion: dulce.seccion?.nombre ?? null,
    };
  }

  /**
   * Instalación tal como se enseña en la API: los campos públicos, sin
   * `imagen_bytes` (contador interno de la cuota) ni `creado_en`.
   */
  private aInstalacion(instalacion: InstalacionShape) {
    return {
      id: instalacion.id,
      nombre_servicio: instalacion.nombre_servicio,
      precio: instalacion.precio,
      moneda: instalacion.moneda,
      imagen_url: instalacion.imagen_url,
      descripcion: instalacion.descripcion,
    };
  }

  /**
   * Modelo tal como se enseña en la API: sin `imagen_bytes` (contador interno de
   * la cuota) ni `creado_en`, y sin `producto`: la relación se carga solo para
   * comprobar el negocio y no debe viajar en la respuesta.
   */
  private aModelo(modelo: ProductoModelo) {
    return {
      id: modelo.id,
      producto_id: modelo.producto_id,
      nombre: modelo.nombre,
      precio: modelo.precio,
      moneda: modelo.moneda,
      imagen_url: modelo.imagen_url,
      atributos: modelo.atributos,
    };
  }

  // --- Modelos de una publicación ---------------------------------------------
  // Una publicación («nevera inverter») puede venderse en varios modelos, cada
  // uno con su precio, su foto y su ficha. La lectura es pública porque la
  // vitrina la pinta; la gestión exige el rol `adc`, como el catálogo.
  @Public()
  @SkipThrottle()
  @Get('productos/:id/modelos')
  async obtenerModelos(@Param('id', new ParseIntPipe()) id: number) {
    const modelos = await this.modelos.porPublicacion(id);

    return { modelos: modelos.map((modelo) => this.aModelo(modelo)) };
  }

  @Roles('adc')
  @Post('productos/:id/modelos')
  async crearModelo(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() createModeloDto: CreateModeloDto,
  ) {
    const { mensaje, modelo } = await this.modelos.crear(id, createModeloDto);

    return { mensaje, modelo: this.aModelo(modelo) };
  }

  @Roles('adc')
  @Patch('modelos/:id')
  async actualizarModelo(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() updateModeloDto: UpdateModeloDto,
  ) {
    const { mensaje, modelo } = await this.modelos.actualizar(id, updateModeloDto);

    return { mensaje, modelo: this.aModelo(modelo) };
  }

  @Roles('adc')
  @Delete('modelos/:id')
  eliminarModelo(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.modelos.eliminar(id, usuarioActual(request));
  }

  // Foto del modelo. Va a la misma cuota y el mismo bucket que las fotos del
  // catálogo; solo cambia la carpeta (`modelos/`).
  @Roles('adc')
  @Post('modelos/:id/imagen')
  @UseInterceptors(interceptorDeImagen('imagen'))
  async subirImagenModelo(
    @Param('id', new ParseIntPipe()) id: number,
    @UploadedFile() file: MulterFile | undefined,
    @Req() request: RequestConUsuario,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Falta el archivo. Envíalo como multipart/form-data en el campo "imagen"',
      );
    }

    const { mensaje, modelo, cuota } = await this.modelos.subirImagen(
      id,
      file,
      usuarioActual(request),
    );

    return { mensaje, modelo: this.aModelo(modelo), cuota };
  }

  @Roles('adc')
  @Delete('modelos/:id/imagen')
  async eliminarImagenModelo(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    const { mensaje, modelo, cuota } = await this.modelos.eliminarImagen(
      id,
      usuarioActual(request),
    );

    return { mensaje, modelo: this.aModelo(modelo), cuota };
  }

  // Secciones de ADC: lectura pública para la vitrina y gestión desde el panel.
  @Public()
  @SkipThrottle()
  @Get('secciones')
  async obtenerSecciones() {
    const { secciones } = await this.catalogo.listarSecciones();

    return {
      secciones: secciones.map((seccion) => ({
        id: seccion.id,
        nombre: seccion.nombre,
        padre_id: seccion.padre_id ?? null,
      })),
    };
  }

  @Roles('adc')
  @Post('secciones')
  crearSeccion(@Body() createSeccionDto: CreateSeccionDto) {
    return this.catalogo.crearSeccion(
      createSeccionDto.nombre,
      createSeccionDto.padre_id,
    );
  }

  // Renombrar, mover de categoría y borrar secciones (punto 2 y subcategorías).
  // El cuerpo del `PATCH` acepta `nombre` y/o `padre_id`; `padre_id: null` la
  // convierte en categoría principal. Borrar una sección con productos o con
  // subcategorías devuelve `409` (ver `CatalogoService.eliminarSeccion()`).
  @Roles('adc')
  @Patch('secciones/:id')
  actualizarSeccion(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() updateSeccionDto: UpdateSeccionDto,
  ) {
    return this.catalogo.actualizarSeccion(id, {
      nombre: updateSeccionDto.nombre,
      padre_id: updateSeccionDto.padre_id,
    });
  }

  @Roles('adc')
  @Delete('secciones/:id')
  eliminarSeccion(@Param('id', new ParseIntPipe()) id: number) {
    return this.catalogo.eliminarSeccion(id);
  }

  // Gestión del catálogo desde el panel de ADC. El id lo asigna el servidor,
  // igual que en Delys (ver `CatalogoService.crearDulce()`).
  @Roles('adc')
  @Post('productos')
  async crearProducto(@Body() createDulceDto: CreateDulceDto) {
    const { mensaje, dulce } = await this.catalogo.crearDulce(createDulceDto);

    return { mensaje, producto: this.aProducto(dulce) };
  }

  @Roles('adc')
  @Patch('productos/:id')
  async actualizarProducto(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() updateDulceDto: UpdateDulceDto,
  ) {
    const { mensaje, dulce } = await this.catalogo.actualizarDulce(id, updateDulceDto);

    return { mensaje, producto: this.aProducto(dulce) };
  }

  @Roles('adc')
  @Delete('productos/:id')
  eliminarProducto(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.catalogo.eliminarDulce(id, usuarioActual(request));
  }

  // Imágenes: multipart/form-data con el archivo en el campo "imagen". La cuota
  // y el bucket son los del rol del token; el producto se busca además por
  // `negocio`, para que un token de ADC no toque las fotos de Delys.
  @Roles('adc')
  @Post('productos/:id/imagen')
  @UseInterceptors(interceptorDeImagen('imagen'))
  async subirImagen(
    @Param('id', new ParseIntPipe()) id: number,
    @UploadedFile() file: MulterFile | undefined,
    @Req() request: RequestConUsuario,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Falta el archivo. Envíalo como multipart/form-data en el campo "imagen"',
      );
    }

    const { mensaje, dulce, cuota } = await this.imagenService.subir(
      id,
      file,
      usuarioActual(request),
    );

    // El servicio se llama `dulce` por Delys; aquí se traduce como en el resto
    // de las rutas de ADC (ver la cabecera de la clase). Sin esto el panel
    // leía `producto` y recibía `undefined`.
    return { mensaje, producto: dulce, cuota };
  }

  @Roles('adc')
  @Delete('productos/:id/imagen')
  async eliminarImagen(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    const { mensaje, dulce, cuota } = await this.imagenService.eliminar(
      id,
      usuarioActual(request),
    );

    return { mensaje, producto: dulce, cuota };
  }

  // --- Instalaciones (punto 3 de todo.md) -------------------------------------
  // Servicios que ofrece ADC (paneles solares, Ecoflow, baterías…): su propia
  // tabla, sin columna `negocio`. Lectura pública para la web; el resto exige
  // el rol `adc` como el catálogo.
  @Public()
  @SkipThrottle()
  @Get('instalaciones')
  async obtenerInstalaciones() {
    const instalaciones = await this.instalaciones.listar();

    return { instalaciones: instalaciones.map((instalacion) => this.aInstalacion(instalacion)) };
  }

  @Roles('adc')
  @Post('instalaciones')
  async crearInstalacion(@Body() createInstalacionDto: CreateInstalacionDto) {
    const { mensaje, instalacion } = await this.instalaciones.crear(createInstalacionDto);

    return { mensaje, instalacion: this.aInstalacion(instalacion) };
  }

  @Roles('adc')
  @Patch('instalaciones/:id')
  async actualizarInstalacion(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() updateInstalacionDto: UpdateInstalacionDto,
  ) {
    const { mensaje, instalacion } = await this.instalaciones.actualizar(id, updateInstalacionDto);

    return { mensaje, instalacion: this.aInstalacion(instalacion) };
  }

  @Roles('adc')
  @Delete('instalaciones/:id')
  eliminarInstalacion(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.instalaciones.eliminar(id, usuarioActual(request));
  }

  @Roles('adc')
  @Post('instalaciones/:id/imagen')
  @UseInterceptors(interceptorDeImagen('imagen'))
  async subirImagenInstalacion(
    @Param('id', new ParseIntPipe()) id: number,
    @UploadedFile() file: MulterFile | undefined,
    @Req() request: RequestConUsuario,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Falta el archivo. Envíalo como multipart/form-data en el campo "imagen"',
      );
    }

    const { mensaje, instalacion, cuota } = await this.instalaciones.subirImagen(
      id,
      file,
      usuarioActual(request),
    );

    return { mensaje, instalacion: this.aInstalacion(instalacion), cuota };
  }

  @Roles('adc')
  @Delete('instalaciones/:id/imagen')
  async eliminarImagenInstalacion(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    const { mensaje, instalacion, cuota } = await this.instalaciones.eliminarImagen(
      id,
      usuarioActual(request),
    );

    return { mensaje, instalacion: this.aInstalacion(instalacion), cuota };
  }

  // Alta de pedidos: pública, por la misma razón que en Delys (el cliente no
  // tiene cuenta). El resto de rutas de pedidos son del panel y piden token.
  // N-5: acotada a 10 por minuto e IP.
  @Public()
  @Post('pedido')
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  agregarPedido(@Body() createPedidoDto: CreatePedidoDto) {
    return this.catalogo.crearPedido(createPedidoDto);
  }

  @Roles('adc')
  @Get('pedidos')
  obtenerPedidos(
    @Query('pagina', new ParseIntPipe({ optional: true })) pagina?: number,
    @Query('limite', new ParseIntPipe({ optional: true })) limite?: number,
  ) {
    return this.catalogo.obtenerTodosPedidos({ pagina, limite });
  }

  @Roles('adc')
  @Get('pedidos/:id')
  obtenerPedido(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogo.obtenerPedido(id);
  }

  @Roles('adc')
  @Delete('pedidos/:id')
  borrarPedido(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogo.remove(id);
  }
}