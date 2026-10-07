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
var ControlService_1;
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
let ControlService = ControlService_1 = class ControlService {
    dataSource;
    logger = new Logger(ControlService_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async ping() {
        try {
            await this.dataSource.query('SELECT 1');
        }
        catch (error) {
            const motivo = error instanceof Error ? error.message : String(error);
            this.logger.error(`GET /ping sin base de datos: ${motivo}`);
            throw new ServiceUnavailableException('El servidor está vivo pero no puede consultar la base de datos');
        }
        return { ok: true };
    }
};
ControlService = ControlService_1 = __decorate([
    Injectable(),
    __param(0, InjectDataSource()),
    __metadata("design:paramtypes", [DataSource])
], ControlService);
export { ControlService };
//# sourceMappingURL=control.service.js.map