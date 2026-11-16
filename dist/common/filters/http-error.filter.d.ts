import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
export declare class HttpErrorFilter implements ExceptionFilter {
    private readonly logger;
    catch(excepcion: unknown, host: ArgumentsHost): void;
}
