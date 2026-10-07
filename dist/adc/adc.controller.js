var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Req, UploadedFile, UseInterceptors, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService } from '../common/services/dulce-imagen.service.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
let AdcController = class AdcController {
    catalogo;
    imagenService;
    constructor(catalogo, imagenService) {
        this.catalogo = catalogo;
        this.imagenService = imagenService;
    }
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
    async obtenerSecciones() {
        const { secciones } = await this.catalogo.listarSecciones();
        return {
            secciones: secciones
                .filter((seccion) => seccion.nombre !== 'dulces')
                .map((seccion) => ({ id: seccion.id, nombre: seccion.nombre })),
        };
    }
    crearSeccion(createSeccionDto) {
        return this.catalogo.crearSeccion(createSeccionDto.nombre);
    }
    async crearProducto(createDulceDto) {
        const { mensaje, dulce } = await this.catalogo.crearDulce(createDulceDto);
        return { mensaje, producto: dulce };
    }
    async actualizarProducto(id, updateDulceDto) {
        const { mensaje, dulce } = await this.catalogo.actualizarDulce(id, updateDulceDto);
        return { mensaje, producto: dulce };
    }
    eliminarProducto(id, request) {
        return this.catalogo.eliminarDulce(id, this.usuarioActual(request));
    }
    subirImagen(id, file, request) {
        if (!file) {
            throw new BadRequestException('Falta el archivo. Envíalo como multipart/form-data en el campo "imagen"');
        }
        return this.imagenService.subir(id, file, this.usuarioActual(request));
    }
    eliminarImagen(id, request) {
        return this.imagenService.eliminar(id, this.usuarioActual(request));
    }
    agregarPedido(createPedidoDto) {
        return this.catalogo.crearPedido(createPedidoDto);
    }
    obtenerPedidos() {
        return this.catalogo.obtenerTodosPedidos();
    }
    obtenerPedido(id) {
        return this.catalogo.obtenerPedido(id);
    }
    borrarPedido(id) {
        return this.catalogo.remove(id);
    }
    usuarioActual(request) {
        if (!request.user)
            throw new BadRequestException('Petición sin usuario autenticado');
        return request.user;
    }
};
__decorate([
    Public(),
    Get('productos'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdcController.prototype, "obtenerProductos", null);
__decorate([
    Public(),
    Get('secciones'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdcController.prototype, "obtenerSecciones", null);
__decorate([
    Roles('adc'),
    Post('secciones'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateSeccionDto]),
    __metadata("design:returntype", void 0)
], AdcController.prototype, "crearSeccion", null);
__decorate([
    Roles('adc'),
    Post('productos'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateDulceDto]),
    __metadata("design:returntype", Promise)
], AdcController.prototype, "crearProducto", null);
__decorate([
    Roles('adc'),
    Patch('productos/:id'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateDulceDto]),
    __metadata("design:returntype", Promise)
], AdcController.prototype, "actualizarProducto", null);
__decorate([
    Roles('adc'),
    Delete('productos/:id'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AdcController.prototype, "eliminarProducto", null);
__decorate([
    Roles('adc'),
    Post('productos/:id/imagen'),
    UseInterceptors(FileInterceptor('imagen', {
        limits: { fileSize: TAMANO_MAXIMO_ARCHIVO, files: 1 },
        fileFilter: (_req, file, callback) => {
            if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
                return callback(new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}. Usa ${TIPOS_PERMITIDOS.join(', ')}`), false);
            }
            return callback(null, true);
        },
    })),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, UploadedFile()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], AdcController.prototype, "subirImagen", null);
__decorate([
    Roles('adc'),
    Delete('productos/:id/imagen'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AdcController.prototype, "eliminarImagen", null);
__decorate([
    Public(),
    Post('pedido'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePedidoDto]),
    __metadata("design:returntype", void 0)
], AdcController.prototype, "agregarPedido", null);
__decorate([
    Roles('adc'),
    Get('pedidos'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdcController.prototype, "obtenerPedidos", null);
__decorate([
    Roles('adc'),
    Get('pedidos/:id'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdcController.prototype, "obtenerPedido", null);
__decorate([
    Roles('adc'),
    Delete('pedidos/:id'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdcController.prototype, "borrarPedido", null);
AdcController = __decorate([
    Controller('adc'),
    __metadata("design:paramtypes", [CatalogoService,
        DulceImagenService])
], AdcController);
export { AdcController };
//# sourceMappingURL=adc.controller.js.map