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
import { CombosService } from '../common/services/combos.service.js';
import type { Combo as ComboShape } from '../common/interfaces/instalaciones-combos.interfaces.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateComboDto } from '../common/dto/create-combo.dto.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import { UpdateComboDto } from '../common/dto/update-combo.dto.js';
import type { RequestConUsuario } from '../auth/auth.interfaces.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('delys')
export class DelysController {
  constructor(
    private readonly catalogo: CatalogoService,
    private readonly imagenService: DulceImagenService,
    private readonly combos: CombosService,
  ) {}

  // Catálogo: público, sin token. Los GET públicos están fuera del rate limit
  // (N-5): la vitrina recorre catálogo, secciones e imágenes en cada visita y un
  // 429 se vería como un fallo de la web, no como un abuso.
  @Public()
  @SkipThrottle()
  @Get('dulces')
  obtenerDulces(
    @Query('pagina', new ParseIntPipe({ optional: true })) pagina?: number,
    @Query('limite', new ParseIntPipe({ optional: true })) limite?: number,
  ) {
    // N-11: la paginación es opcional y solo corta si llegan los dos parámetros.
    return this.catalogo.obtenerTodosDulces({ pagina, limite });
  }

  @Public()
  @SkipThrottle()
  @Get('ofertas')
  obtenerOfertas() {
    return this.catalogo.obtenerOfertas();
  }

  // Secciones de la pastelería: lectura pública para la vitrina y alta desde el
  // panel. Aquí la sección "dulces" sí aparece: es donde vive todo el catálogo
  // de Delys (los productos viejos se migran ahí), así que esconderla rompería
  // la vitrina. En ADC se hace al revés (ver `AdcController`).
  @Public()
  @SkipThrottle()
  @Get('secciones')
  obtenerSecciones() {
    return this.catalogo.listarSecciones();
  }

  @Roles('delys')
  @Post('secciones')
  crearSeccion(@Body() createSeccionDto: CreateSeccionDto) {
    // Delys no usa subcategorías: su catálogo es plano (solo publica dulces).
    // Aunque el DTO acepte `padre_id`, aquí se ignora a propósito y la sección
    // se crea siempre como principal.
    return this.catalogo.crearSeccion(createSeccionDto.nombre);
  }

  // Gestión del catálogo desde el panel de la pastelería. Estas tres rutas son
  // la contrapartida de que `POST /delys/pedido` ya no escriba el catálogo: el
  // pedido no lo toca, pero quien administra la vitrina sí puede.
  // El id del dulce lo asigna el servidor; ver `CatalogoService.crearDulce()`.
  @Roles('delys')
  @Post('dulces')
  crearDulce(@Body() createDulceDto: CreateDulceDto) {
    return this.catalogo.crearDulce(createDulceDto);
  }

  @Roles('delys')
  @Patch('dulces/:id')
  actualizarDulce(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() updateDulceDto: UpdateDulceDto,
  ) {
    return this.catalogo.actualizarDulce(id, updateDulceDto);
  }

  @Roles('delys')
  @Delete('dulces/:id')
  eliminarDulce(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.catalogo.eliminarDulce(id, usuarioActual(request));
  }

  // Imágenes: multipart/form-data con el archivo en el campo "imagen".
  // La cuota es la del rol del token, no la que mande el cliente.
  // Sin `storage`, multer usa memoryStorage: el binario llega en file.buffer
  // y no se toca el disco del servidor.
  @Roles('delys')
  @Post('dulces/:id/imagen')
  @UseInterceptors(interceptorDeImagen('imagen'))
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

    return this.imagenService.subir(id, file, usuarioActual(request));
  }

  @Roles('delys')
  @Delete('dulces/:id/imagen')
  eliminarImagen(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.imagenService.eliminar(id, usuarioActual(request));
  }

  // --- Combos (punto 3 de todo.md) --------------------------------------------
  // Ofertas de la pastelería: varios dulces juntos por un precio, en su propia
  // tabla. Lectura pública para la web; el resto exige el rol `delys`.
  @Public()
  @SkipThrottle()
  @Get('combos')
  async obtenerCombos() {
    const combos = await this.combos.listar();

    return { combos: combos.map((combo) => this.aCombo(combo)) };
  }

  @Roles('delys')
  @Post('combos')
  async crearCombo(@Body() createComboDto: CreateComboDto) {
    const { mensaje, combo } = await this.combos.crear(createComboDto);

    return { mensaje, combo: this.aCombo(combo) };
  }

  @Roles('delys')
  @Patch('combos/:id')
  async actualizarCombo(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() updateComboDto: UpdateComboDto,
  ) {
    const { mensaje, combo } = await this.combos.actualizar(id, updateComboDto);

    return { mensaje, combo: this.aCombo(combo) };
  }

  @Roles('delys')
  @Delete('combos/:id')
  eliminarCombo(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.combos.eliminar(id, usuarioActual(request));
  }

  @Roles('delys')
  @Post('combos/:id/imagen')
  @UseInterceptors(interceptorDeImagen('imagen'))
  async subirImagenCombo(
    @Param('id', new ParseIntPipe()) id: number,
    @UploadedFile() file: MulterFile | undefined,
    @Req() request: RequestConUsuario,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Falta el archivo. Envíalo como multipart/form-data en el campo "imagen"',
      );
    }

    const { mensaje, combo, cuota } = await this.combos.subirImagen(
      id,
      file,
      usuarioActual(request),
    );

    return { mensaje, combo: this.aCombo(combo), cuota };
  }

  @Roles('delys')
  @Delete('combos/:id/imagen')
  async eliminarImagenCombo(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    const { mensaje, combo, cuota } = await this.combos.eliminarImagen(
      id,
      usuarioActual(request),
    );

    return { mensaje, combo: this.aCombo(combo), cuota };
  }

  /**
   * Combo tal como se enseña en la API: sin `imagen_bytes` (contador interno de
   * la cuota) ni `creado_en`, y con los dulces reducidos a nombre y cantidad.
   */
  private aCombo(combo: ComboShape) {
    return {
      id: combo.id,
      nombre_combo: combo.nombre_combo,
      precio: combo.precio,
      moneda: combo.moneda,
      imagen_url: combo.imagen_url,
      dulces: combo.dulces.map((dulce) => ({
        nombre_dulce: dulce.nombre_dulce,
        cantidad: dulce.cantidad,
      })),
    };
  }

  // Alta de pedidos: pública. El cliente de la pastelería no tiene cuenta, así que
  // no puede llevar token; el resto de rutas de pedidos sí lo exigen, porque esas
  // son las del panel (ver, borrar). N-5: acotada a 10 por minuto e IP.
  @Public()
  @Post('pedido')
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  agregarPedido(@Body() createPedidoDto: CreatePedidoDto) {
    return this.catalogo.crearPedido(createPedidoDto);
  }

  @Roles('delys')
  @Get('pedidos')
  obtenerPedidos(
    @Query('pagina', new ParseIntPipe({ optional: true })) pagina?: number,
    @Query('limite', new ParseIntPipe({ optional: true })) limite?: number,
  ) {
    return this.catalogo.obtenerTodosPedidos({ pagina, limite });
  }

  @Roles('delys')
  @Get('pedidos/:id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogo.obtenerPedido(id);
  }

  @Roles('delys')
  @Delete('pedidos/:id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogo.remove(id);
  }
}
