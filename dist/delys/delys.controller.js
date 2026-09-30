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
import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Req, UploadedFile, UseInterceptors, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DelysService } from './delys.service.js';
import { DulceImagenService } from './dulce-imagen.service.js';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
let DelysController = class DelysController {
    delysService;
    imagenService;
    constructor(delysService, imagenService) {
        this.delysService = delysService;
        this.imagenService = imagenService;
    }
    obtenerDulces() {
        return this.delysService.obtenerTodosDulces();
    }
    obtenerOfertas() {
        return this.delysService.obtenerOfertas();
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
        return this.delysService.crearPedido(createPedidoDto);
    }
    obtenerPedidos() {
        return this.delysService.obtenerTodosPedidos();
    }
    findOne(id) {
        return this.delysService.obtenerPedido(id);
    }
    remove(id) {
        return this.delysService.remove(id);
    }
    usuarioActual(request) {
        if (!request.user)
            throw new BadRequestException('Petición sin usuario autenticado');
        return request.user;
    }
};
__decorate([
    Public(),
    Get('dulces'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "obtenerDulces", null);
__decorate([
    Public(),
    Get('ofertas'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "obtenerOfertas", null);
__decorate([
    Roles('delys'),
    Post('dulces/:id/imagen'),
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
    Roles('delys'),
    Post('pedido'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePedidoDto]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "agregarPedido", null);
__decorate([
    Roles('delys'),
    Get('pedidos'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
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
    __metadata("design:paramtypes", [DelysService,
        DulceImagenService])
], DelysController);
export { DelysController };
//# sourceMappingURL=delys.controller.js.map