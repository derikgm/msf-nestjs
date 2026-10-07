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
import { FileInterceptor } from '@nestjs/platform-express';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService, type MulterFile } from '../common/services/dulce-imagen.service.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import type { AuthUser, RequestConUsuario } from '../auth/auth.interfaces.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';

/** Mismo tope y mismos tipos que en Delys: es el mismo Storage y el mismo plan. */
const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024;

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
  // productos y sus secciones de navegación, **exceptuando la sección "dulces"**:
  // esa es la sección especial del catálogo heredado (los dulces de la
  // pastelería), así que ADC ni la lista ni devuelve los productos que viven en
  // ella. El resto del catálogo sí, compuesto por sus secciones y productos.
  @Public()
  @Get('productos')
  async obtenerProductos() {
    const { dulces } = await this.catalogo.obtenerTodosDulces();
    const { secciones } = await this.catalogo.listarSecciones();

    const visibles = dulces.filter((dulce) => dulce.seccion?.nombre !== 'dulces');

    return {
      productos: visibles.map((dulce) => ({
        id: dulce.id,
        nombre: dulce.nombre,
        precio: dulce.precio,
        moneda: dulce.moneda,
        imagen_url: dulce.imagen_url,
        seccion_id: dulce.seccion?.id ?? null,
        seccion: dulce.seccion?.nombre ?? null,
      })),
      secciones: secciones
        .filter((seccion) => seccion.nombre !== 'dulces')
        .map((seccion) => ({ id: seccion.id, nombre: seccion.nombre })),
    };
  }

  // Secciones de ADC: lectura pública para la vitrina y alta desde el panel.
  @Public()
  @Get('secciones')
  async obtenerSecciones() {
    const { secciones } = await this.catalogo.listarSecciones();

    return {
      secciones: secciones
        .filter((seccion) => seccion.nombre !== 'dulces')
        .map((seccion) => ({ id: seccion.id, nombre: seccion.nombre })),
    };
  }

  @Roles('adc')
  @Post('secciones')
  crearSeccion(@Body() createSeccionDto: CreateSeccionDto) {
    return this.catalogo.crearSeccion(createSeccionDto.nombre);
  }

  // Gestión del catálogo desde el panel de ADC. El id lo asigna el servidor,
  // igual que en Delys (ver `CatalogoService.crearDulce()`).
  @Roles('adc')
  @Post('productos')
  async crearProducto(@Body() createDulceDto: CreateDulceDto) {
    const { mensaje, dulce } = await this.catalogo.crearDulce(createDulceDto);

    return { mensaje, producto: dulce };
  }

  @Roles('adc')
  @Patch('productos/:id')
  async actualizarProducto(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() updateDulceDto: UpdateDulceDto,
  ) {
    const { mensaje, dulce } = await this.catalogo.actualizarDulce(id, updateDulceDto);

    return { mensaje, producto: dulce };
  }

  @Roles('adc')
  @Delete('productos/:id')
  eliminarProducto(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.catalogo.eliminarDulce(id, this.usuarioActual(request));
  }

  // Imágenes: multipart/form-data con el archivo en el campo "imagen". La cuota
  // y el bucket son los del rol del token; el producto se busca además por
  // `negocio`, para que un token de ADC no toque las fotos de Delys.
  @Roles('adc')
  @Post('productos/:id/imagen')
  @UseInterceptors(
    FileInterceptor('imagen', {
      limits: { fileSize: TAMANO_MAXIMO_ARCHIVO, files: 1 },
      fileFilter: (_req, file, callback) => {
        if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `Tipo de archivo no permitido: ${file.mimetype}. Usa ${TIPOS_PERMITIDOS.join(', ')}`,
            ),
            false,
          );
        }

        return callback(null, true);
      },
    }),
  )
  subirImagen(
    @Param('id', new ParseIntPipe()) id: number,
    @UploadedFile() file: MulterFile | undefined,
    @Req() request: RequestConUsuario,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Falta el archivo. Envíalo como multipart/form-data en el campo "imagen"',
      );
    }

    return this.imagenService.subir(id, file, this.usuarioActual(request));
  }

  @Roles('adc')
  @Delete('productos/:id/imagen')
  eliminarImagen(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.imagenService.eliminar(id, this.usuarioActual(request));
  }

  // Alta de pedidos: pública, por la misma razón que en Delys (el cliente no
  // tiene cuenta). El resto de rutas de pedidos son del panel y piden token.
  @Public()
  @Post('pedido')
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

  /** El JwtAuthGuard ya bloquea sin token; esto solo evita el undefined si se reutiliza. */
  private usuarioActual(request: RequestConUsuario): AuthUser {
    if (!request.user) throw new BadRequestException('Petición sin usuario autenticado');

    return request.user;
  }
}