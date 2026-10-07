import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService, type MulterFile } from '../common/services/dulce-imagen.service.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import type { RequestConUsuario } from '../auth/auth.interfaces.js';
export declare class AdcController {
    private readonly catalogo;
    private readonly imagenService;
    constructor(catalogo: CatalogoService, imagenService: DulceImagenService);
    obtenerProductos(): Promise<{
        productos: import("../common/entities/dulce.entity.js").Dulce[];
    }>;
    crearProducto(createDulceDto: CreateDulceDto): Promise<{
        mensaje: string;
        producto: import("../common/entities/dulce.entity.js").Dulce;
    }>;
    actualizarProducto(id: number, updateDulceDto: UpdateDulceDto): Promise<{
        mensaje: string;
        producto: import("../common/entities/dulce.entity.js").Dulce;
    }>;
    eliminarProducto(id: number, request: RequestConUsuario): Promise<{
        ok: boolean;
    }>;
    subirImagen(id: number, file: MulterFile | undefined, request: RequestConUsuario): Promise<{
        mensaje: string;
        dulce: import("../common/entities/dulce.entity.js").Dulce;
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    eliminarImagen(id: number, request: RequestConUsuario): Promise<{
        mensaje: string;
        dulce: import("../common/entities/dulce.entity.js").Dulce;
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    agregarPedido(createPedidoDto: CreatePedidoDto): Promise<{
        ok: boolean;
        pedido: import("../common/entities/pedido.entity.js").Pedido;
    }>;
    obtenerPedidos(): Promise<{
        pedidos: import("../common/entities/pedido.entity.js").Pedido[];
    }>;
    obtenerPedido(id: string): Promise<import("../common/entities/pedido.entity.js").Pedido>;
    borrarPedido(id: string): Promise<{
        ok: boolean;
    }>;
    private usuarioActual;
}
