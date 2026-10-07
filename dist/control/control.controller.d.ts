import { ControlService } from './control.service.js';
export declare class ControlController {
    private readonly controlService;
    constructor(controlService: ControlService);
    ping(): Promise<{
        ok: boolean;
    }>;
}
