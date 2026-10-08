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
import { minutes, SkipThrottle, Throttle } from '@nestjs/throttler';
import { interceptorDeImagen } from '../common/uploads/imagen.archivo.js';
import { usuarioActual } from '../common/utils/auth.util.js';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService } from '../common/services/dulce-imagen.service.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
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
        return {
            productos: dulces.map((dulce) => this.aProducto(dulce)),
            secciones: secciones.map((seccion) => ({ id: seccion.id, nombre: seccion.nombre })),
        };
    }
    aProducto(dulce) {
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
    async obtenerSecciones() {
        const { secciones } = await this.catalogo.listarSecciones();
        return {
            secciones: secciones.map((seccion) => ({ id: seccion.id, nombre: seccion.nombre })),
        };
    }
    crearSeccion(createSeccionDto) {
        return this.catalogo.crearSeccion(createSeccionDto.nombre);
    }
    actualizarSeccion(id, createSeccionDto) {
        return this.catalogo.actualizarSeccion(id, createSeccionDto.nombre);
    }
    eliminarSeccion(id) {
        return this.catalogo.eliminarSeccion(id);
    }
    async crearProducto(createDulceDto) {
        const { mensaje, dulce } = await this.catalogo.crearDulce(createDulceDto);
        return { mensaje, producto: this.aProducto(dulce) };
    }
    async actualizarProducto(id, updateDulceDto) {
        const { mensaje, dulce } = await this.catalogo.actualizarDulce(id, updateDulceDto);
        return { mensaje, producto: this.aProducto(dulce) };
    }
    eliminarProducto(id, request) {
        return this.catalogo.eliminarDulce(id, usuarioActual(request));
    }
    async subirImagen(id, file, request) {
        if (!file) {
            throw new BadRequestException('Falta el archivo. Envíalo como multipart/form-data en el campo "imagen"');
        }
        const { mensaje, dulce, cuota } = await this.imagenService.subir(id, file, usuarioActual(request));
        return { mensaje, producto: dulce, cuota };
    }
    async eliminarImagen(id, request) {
        const { mensaje, dulce, cuota } = await this.imagenService.eliminar(id, usuarioActual(request));
        return { mensaje, producto: dulce, cuota };
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
};
__decorate([
    Public(),
    SkipThrottle(),
    Get('productos'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdcController.prototype, "obtenerProductos", null);
__decorate([
    Public(),
    SkipThrottle(),
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
    Patch('secciones/:id'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, CreateSeccionDto]),
    __metadata("design:returntype", void 0)
], AdcController.prototype, "actualizarSeccion", null);
__decorate([
    Roles('adc'),
    Delete('secciones/:id'),
    __param(0, Param('id', new ParseIntPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdcController.prototype, "eliminarSeccion", null);
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
    UseInterceptors(interceptorDeImagen('imagen')),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, UploadedFile()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], AdcController.prototype, "subirImagen", null);
__decorate([
    Roles('adc'),
    Delete('productos/:id/imagen'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AdcController.prototype, "eliminarImagen", null);
__decorate([
    Public(),
    Post('pedido'),
    Throttle({ default: { limit: 10, ttl: minutes(1) } }),
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