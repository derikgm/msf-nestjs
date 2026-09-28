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
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, } from '@nestjs/common';
import { DelysService } from './delys.service.js';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { Public } from '../auth/public.decorator.js';
let DelysController = class DelysController {
    delysService;
    constructor(delysService) {
        this.delysService = delysService;
    }
    obtenerDulces() {
        return this.delysService.obtenerTodosDulces();
    }
    obtenerOfertas() {
        return this.delysService.obtenerOfertas();
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
    Post('pedido'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePedidoDto]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "agregarPedido", null);
__decorate([
    Get('pedidos'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "obtenerPedidos", null);
__decorate([
    Get(':id'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "findOne", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DelysController.prototype, "remove", null);
DelysController = __decorate([
    Controller('delys'),
    __metadata("design:paramtypes", [DelysService])
], DelysController);
export { DelysController };
//# sourceMappingURL=delys.controller.js.map