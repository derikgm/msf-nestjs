import { DataSource } from 'typeorm';
export declare class ControlService {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    ping(): Promise<{
        ok: boolean;
    }>;
}
