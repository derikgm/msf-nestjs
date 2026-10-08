import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService, type MulterFile } from '../common/services/dulce-imagen.service.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import type { RequestConUsuario } from '../auth/auth.interfaces.js';
export declare class DelysController {
    private readonly catalogo;
    private readonly imagenService;
    constructor(catalogo: CatalogoService, imagenService: DulceImagenService);
    obtenerDulces(): Promise<{
        dulces: import("../common/interfaces/catalogo.interfaces.js").DulcePublico[];
    }>;
    obtenerOfertas(): {
        ofertas: import("../common/interfaces/catalogo.interfaces.js").Dulce[];
    };
    obtenerSecciones(): Promise<{
        secciones: import("../common/entities/seccion.entity.js").Seccion[];
    }>;
    crearSeccion(createSeccionDto: CreateSeccionDto): Promise<{
        mensaje: string;
        seccion: import("../common/entities/seccion.entity.js").Seccion;
    }>;
    crearDulce(createDulceDto: CreateDulceDto): Promise<{
        mensaje: string;
        dulce: import("../common/interfaces/catalogo.interfaces.js").DulcePublico;
    }>;
    actualizarDulce(id: number, updateDulceDto: UpdateDulceDto): Promise<{
        mensaje: string;
        dulce: import("../common/interfaces/catalogo.interfaces.js").DulcePublico;
    }>;
    eliminarDulce(id: number, request: RequestConUsuario): Promise<{
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
    findOne(id: string): Promise<import("../common/entities/pedido.entity.js").Pedido>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
