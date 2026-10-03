import { DelysService } from './delys.service.js';
import { DulceImagenService, type MulterFile } from './dulce-imagen.service.js';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { CreateDulceDto } from './dto/create-dulce.dto.js';
import { UpdateDulceDto } from './dto/update-dulce.dto.js';
import type { RequestConUsuario } from '../auth/auth.interfaces.js';
export declare class DelysController {
    private readonly delysService;
    private readonly imagenService;
    constructor(delysService: DelysService, imagenService: DulceImagenService);
    obtenerDulces(): Promise<{
        dulces: import("./entities/dulce.entity.js").Dulce[];
    }>;
    obtenerOfertas(): {
        ofertas: import("./interfaces/delys.interfaces.js").Dulce[];
    };
    crearDulce(createDulceDto: CreateDulceDto): Promise<{
        mensaje: string;
        dulce: import("./entities/dulce.entity.js").Dulce;
    }>;
    actualizarDulce(id: number, updateDulceDto: UpdateDulceDto): Promise<{
        mensaje: string;
        dulce: import("./entities/dulce.entity.js").Dulce;
    }>;
    eliminarDulce(id: number, request: RequestConUsuario): Promise<{
        ok: boolean;
    }>;
    subirImagen(id: number, file: MulterFile | undefined, request: RequestConUsuario): Promise<{
        mensaje: string;
        dulce: import("./entities/dulce.entity.js").Dulce;
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    eliminarImagen(id: number, request: RequestConUsuario): Promise<{
        mensaje: string;
        dulce: import("./entities/dulce.entity.js").Dulce;
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    agregarPedido(createPedidoDto: CreatePedidoDto): Promise<{
        ok: boolean;
        pedido: import("./entities/pedido.entity.js").Pedido;
    }>;
    obtenerPedidos(): Promise<{
        pedidos: import("./entities/pedido.entity.js").Pedido[];
    }>;
    findOne(id: string): Promise<import("./entities/pedido.entity.js").Pedido>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
    private usuarioActual;
}
