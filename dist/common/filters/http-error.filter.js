var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpErrorFilter_1;
import { Catch, HttpException, Logger, } from '@nestjs/common';
let HttpErrorFilter = HttpErrorFilter_1 = class HttpErrorFilter {
    logger = new Logger(HttpErrorFilter_1.name);
    catch(excepcion, host) {
        const ctx = host.switchToHttp();
        const respuesta = ctx.getResponse();
        const peticion = ctx.getRequest();
        const ruta = `${peticion.method} ${peticion.url}`;
        if (excepcion instanceof HttpException) {
            const status = excepcion.getStatus();
            const cuerpo = excepcion.getResponse();
            const mensaje = typeof cuerpo === 'string'
                ? cuerpo
                : cuerpo.message;
            if (status >= 500) {
                this.logger.error(`${ruta} -> ${status}: ${JSON.stringify(mensaje)}`, excepcion.stack);
            }
            else {
                this.logger.warn(`${ruta} -> ${status}: ${JSON.stringify(mensaje)}`);
            }
            respuesta.status(status).json({ statusCode: status, mensaje });
            return;
        }
        const statusBruto = excepcion?.status;
        if (typeof statusBruto === 'number' &&
            Number.isInteger(statusBruto) &&
            statusBruto >= 400 &&
            statusBruto < 500) {
            const mensaje = excepcion?.message ?? 'Petición inválida';
            this.logger.warn(`${ruta} -> ${statusBruto}: ${JSON.stringify(mensaje)}`);
            respuesta.status(statusBruto).json({ statusCode: statusBruto, mensaje });
            return;
        }
        const detalle = excepcion?.stack ?? String(excepcion);
        this.logger.error(`${ruta} -> 500`, detalle);
        respuesta
            .status(500)
            .json({ statusCode: 500, mensaje: 'Error interno del servidor' });
    }
};
HttpErrorFilter = HttpErrorFilter_1 = __decorate([
    Catch()
], HttpErrorFilter);
export { HttpErrorFilter };
//# sourceMappingURL=http-error.filter.js.map