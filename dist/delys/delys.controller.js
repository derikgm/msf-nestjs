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
import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, Req, UploadedFile, UseInterceptors, } from '@nestjs/common';
import { minutes, SkipThrottle, Throttle } from '@nestjs/throttler';
import { interceptorDeImagen } from '../common/uploads/imagen.archivo.js';
import { usuarioActual } from '../common/utils/auth.util.js';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService } from '../common/services/dulce-imagen.service.js';
import { CombosService } from '../common/services/combos.service.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateComboDto } from '../common/dto/create-combo.dto.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import { UpdateComboDto } from '../common/dto/update-combo.dto.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
let DelysController = class DelysController {
    catalogo;
    imagenService;
    combos;
    constructor(catalogo, imagenService, combos) {
        this.catalogo = catalogo;
        this.imagenService = imagenService;
        this.combos = combos;
    }
    obtenerDulces(pagina, limite) {
        return this.catalogo.obtenerTodosDulces({ pagina, limite });
    }
    obtenerOfertas() {
        return this.catalogo.obtenerOfertas();
    }
    obtenerSecciones() {
        return this.catalogo.listarSecciones();
    }
    crearSeccion(createSeccionDto) {
        return this.catalogo.crearSeccion(createSeccionDto.nombre);
    }
    crearDulce(createDulceDto) {
        return this.catalogo.crearDulce(createDulceDto);
    }
    actualizarDulce(id, updateDulceDto) {
        return this.catalogo.actualizarDulce(id, updateDulceDto);
    }
    eliminarDulce(id, request) {
        return this.catalogo.eliminarDulce(id, usuarioActual(request));
    }
    subirImagen(id, file, request) {
        if (!file) {
            throw new BadRequestException('Falta el archivo. Envíalo como multipart/form-data en el campo "imagen"');
        }
        return this.imagenService.subir(id, file, usuarioActual(request));
    }
    eliminarImagen(id, request) {
        return this.imagenService.eliminar(id, usuarioActual(request));
    }
    async obtenerCombos() {
        const combos = await this.combos.listar();
        return { combos: combos.map((combo) => this.aCombo(combo)) };
    }
    async crearCombo(createComboDto) {
        const { mensaje, combo } = await this.combos.crear(createComboDto);
        return { mensaje, combo: this.aCombo(combo) };
    }
    async actualizarCombo(id, updateComboDto) {
        const { mensaje, combo } = await this.combos.actualizar(id, updateComboDto);
        return { mensaje, combo: this.aCombo(combo) };
    }
    eliminarCombo(id, request) {
        return this.combos.eliminar(id, usuarioActual(request));
    }
    async subirImagenCombo(id, file, request) {
        if (!file) {
            throw new BadRequestException('Falta el archivo. Envíalo como multipart/form-data en el campo "imagen"');
        }
        const { mensaje, combo, cuota } = await this.combos.subirImagen(id, file, usuarioActual(request));
        return { mensaje, combo: this.aCombo(combo), cuota };
    }
    async eliminarImagenCombo(id, request) {
        const { mensaje, combo, cuota } = await this.combos.eliminarImagen(id, usuarioActual(request));
        return { mensaje, combo: this.aCombo(combo), cuota };
    }
    aCombo(combo) {
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
    agregarPedido(createPedidoDto) {
        return this.catalogo.crearPedido(createPedidoDto);
    }
    obtenerPedidos(pagina, limite) {
        return this.catalogo.obtenerTodosPedidos({ pagina, limite });
    }
    findOne(id) {
        return this.catalogo.obtenerPedido(id);
    }
    remove(id) {
        return this.catalogo.remove(id);
    }
};
__decorate([
    Public(),
    SkipThrottle(),
    Get('dulces'),
    __param(0, Query('pagina', new ParseIntPipe({ optional: true }))),
    __param(1, Query('limite', new ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "obtenerDulces", null);
__decorate([
    Public(),
    SkipThrottle(),
    Get('ofertas'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "obtenerOfertas", null);
__decorate([
    Public(),
    SkipThrottle(),
    Get('secciones'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "obtenerSecciones", null);
__decorate([
    Roles('delys'),
    Post('secciones'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateSeccionDto]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "crearSeccion", null);
__decorate([
    Roles('delys'),
    Post('dulces'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateDulceDto]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "crearDulce", null);
__decorate([
    Roles('delys'),
    Patch('dulces/:id'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateDulceDto]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "actualizarDulce", null);
__decorate([
    Roles('delys'),
    Delete('dulces/:id'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "eliminarDulce", null);
__decorate([
    Roles('delys'),
    Post('dulces/:id/imagen'),
    UseInterceptors(interceptorDeImagen('imagen')),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, UploadedFile()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "subirImagen", null);
__decorate([
    Roles('delys'),
    Delete('dulces/:id/imagen'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "eliminarImagen", null);
__decorate([
    Public(),
    SkipThrottle(),
    Get('combos'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DelysController.prototype, "obtenerCombos", null);
__decorate([
    Roles('delys'),
    Post('combos'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateComboDto]),
    __metadata("design:returntype", Promise)
], DelysController.prototype, "crearCombo", null);
__decorate([
    Roles('delys'),
    Patch('combos/:id'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateComboDto]),
    __metadata("design:returntype", Promise)
], DelysController.prototype, "actualizarCombo", null);
__decorate([
    Roles('delys'),
    Delete('combos/:id'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "eliminarCombo", null);
__decorate([
    Roles('delys'),
    Post('combos/:id/imagen'),
    UseInterceptors(interceptorDeImagen('imagen')),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, UploadedFile()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], DelysController.prototype, "subirImagenCombo", null);
__decorate([
    Roles('delys'),
    Delete('combos/:id/imagen'),
    __param(0, Param('id', new ParseIntPipe())),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], DelysController.prototype, "eliminarImagenCombo", null);
__decorate([
    Public(),
    Post('pedido'),
    Throttle({ default: { limit: 10, ttl: minutes(1) } }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePedidoDto]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "agregarPedido", null);
__decorate([
    Roles('delys'),
    Get('pedidos'),
    __param(0, Query('pagina', new ParseIntPipe({ optional: true }))),
    __param(1, Query('limite', new ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "obtenerPedidos", null);
__decorate([
    Roles('delys'),
    Get('pedidos/:id'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "findOne", null);
__decorate([
    Roles('delys'),
    Delete('pedidos/:id'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "remove", null);
DelysController = __decorate([
    Controller('delys'),
    __metadata("design:paramtypes", [CatalogoService,
        DulceImagenService,
        CombosService])
], DelysController);
export { DelysController };
//# sourceMappingURL=delys.controller.js.map