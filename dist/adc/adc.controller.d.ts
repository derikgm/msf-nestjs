import { DelysService } from '../delys/delys.service.js';
import { DulceImagenService, type MulterFile } from '../delys/dulce-imagen.service.js';
import { CreateDulceDto } from '../delys/dto/create-dulce.dto.js';
import { CreatePedidoDto } from '../delys/dto/create-pedido.dto.js';
import { UpdateDulceDto } from '../delys/dto/update-dulce.dto.js';
import type { RequestConUsuario } from '../auth/auth.interfaces.js';
export declare class AdcController {
    private readonly delysService;
    private readonly imagenService;
    constructor(delysService: DelysService, imagenService: DulceImagenService);
    obtenerProductos(): Promise<{
        productos: import("../delys/entities/dulce.entity.js").Dulce[];
    }>;
    crearProducto(createDulceDto: CreateDulceDto): Promise<{
        mensaje: string;
        producto: import("../delys/entities/dulce.entity.js").Dulce;
    }>;
    actualizarProducto(id: number, updateDulceDto: UpdateDulceDto): Promise<{
        mensaje: string;
        producto: import("../delys/entities/dulce.entity.js").Dulce;
    }>;
    eliminarProducto(id: number, request: RequestConUsuario): Promise<{
        ok: boolean;
    }>;
    subirImagen(id: number, file: MulterFile | undefined, request: RequestConUsuario): Promise<{
        mensaje: string;
        dulce: import("../delys/entities/dulce.entity.js").Dulce;
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    eliminarImagen(id: number, request: RequestConUsuario): Promise<{
        mensaje: string;
        dulce: import("../delys/entities/dulce.entity.js").Dulce;
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    agregarPedido(createPedidoDto: CreatePedidoDto): Promise<{
        ok: boolean;
        pedido: import("../delys/entities/pedido.entity.js").Pedido;
    }>;
    obtenerPedidos(): Promise<{
        pedidos: import("../delys/entities/pedido.entity.js").Pedido[];
    }>;
    obtenerPedido(id: string): Promise<import("../delys/entities/pedido.entity.js").Pedido>;
    borrarPedido(id: string): Promise<{
        ok: boolean;
    }>;
    private usuarioActual;
}
