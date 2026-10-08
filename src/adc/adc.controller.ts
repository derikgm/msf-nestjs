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
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { minutes, SkipThrottle, Throttle } from '@nestjs/throttler';
import { interceptorDeImagen } from '../common/uploads/imagen.archivo.js';
import { usuarioActual } from '../common/utils/auth.util.js';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService, type MulterFile } from '../common/services/dulce-imagen.service.js';
import type { DulcePublico } from '../common/interfaces/catalogo.interfaces.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
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

    return {
      productos: dulces.map((dulce) => this.aProducto(dulce)),
      secciones: secciones.map((seccion) => ({ id: seccion.id, nombre: seccion.nombre })),
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
      seccion_id: dulce.seccion_id,
      seccion: dulce.seccion?.nombre ?? null,
    };
  }

  // Secciones de ADC: lectura pública para la vitrina y gestión desde el panel.
  @Public()
  @SkipThrottle()
  @Get('secciones')
  async obtenerSecciones() {
    const { secciones } = await this.catalogo.listarSecciones();

    return {
      secciones: secciones.map((seccion) => ({ id: seccion.id, nombre: seccion.nombre })),
    };
  }

  @Roles('adc')
  @Post('secciones')
  crearSeccion(@Body() createSeccionDto: CreateSeccionDto) {
    return this.catalogo.crearSeccion(createSeccionDto.nombre);
  }

  // Renombrar y borrar secciones (punto 2). El cuerpo del `PATCH` es la misma
  // forma que el alta —solo manda el nombre—, así que se reutiliza el DTO.
  // Borrar una sección con productos devuelve `409` con el número de ellos en
  // vez de moverlos a escondidas (ver `CatalogoService.eliminarSeccion()`).
  @Roles('adc')
  @Patch('secciones/:id')
  actualizarSeccion(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() createSeccionDto: CreateSeccionDto,
  ) {
    return this.catalogo.actualizarSeccion(id, createSeccionDto.nombre);
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
  obtenerPedidos() {
    return this.catalogo.obtenerTodosPedidos();
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