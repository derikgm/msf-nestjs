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
import { Controller, Get, Req } from '@nestjs/common';
import { StorageQuotaService } from '../../services/storage-quota.service.js';
import { usuarioActual } from '../../utils/auth.util.js';
let StorageQuotaController = class StorageQuotaController {
    quotaService;
    constructor(quotaService) {
        this.quotaService = quotaService;
    }
    getQuota(request) {
        return this.quotaService.getResumen(usuarioActual(request).rol);
    }
};
__decorate([
    Get('quota'),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StorageQuotaController.prototype, "getQuota", null);
StorageQuotaController = __decorate([
    Controller('storage'),
    __metadata("design:paramtypes", [StorageQuotaService])
], StorageQuotaController);
export { StorageQuotaController };
//# sourceMappingURL=storage-quota.controller.js.map