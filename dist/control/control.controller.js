var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Controller, Get } from '@nestjs/common';
import { ControlService } from './control.service.js';
let ControlController = class ControlController {
    controlService;
    constructor(controlService) {
        this.controlService = controlService;
    }
    ping() {
        return this.controlService.ping();
    }
};
__decorate([
    Get("ping"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ControlController.prototype, "ping", null);
ControlController = __decorate([
    Controller(),
    __metadata("design:paramtypes", [ControlService])
], ControlController);
export { ControlController };
//# sourceMappingURL=control.controller.js.map