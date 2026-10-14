import { StorageQuotaService } from '../../services/storage-quota.service.js';
import type { RequestConUsuario } from '../../../auth/auth.interfaces.js';
export declare class StorageQuotaController {
    private readonly quotaService;
    constructor(quotaService: StorageQuotaService);
    getQuota(request: RequestConUsuario): Promise<import("../../services/storage-quota.service.js").ResumenCuota>;
}
