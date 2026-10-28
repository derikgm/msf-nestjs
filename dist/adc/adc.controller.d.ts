import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService, type MulterFile } from '../common/services/dulce-imagen.service.js';
import { InstalacionesService } from '../common/services/instalaciones.service.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreateInstalacionDto } from '../common/dto/create-instalacion.dto.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import { UpdateInstalacionDto } from '../common/dto/update-instalacion.dto.js';
import { UpdateSeccionDto } from '../common/dto/update-seccion.dto.js';
import type { RequestConUsuario } from '../auth/auth.interfaces.js';
export declare class AdcController {
    private readonly catalogo;
    private readonly imagenService;
    private readonly instalaciones;
    constructor(catalogo: CatalogoService, imagenService: DulceImagenService, instalaciones: InstalacionesService);
    obtenerProductos(): Promise<{
        productos: {
            id: number;
            nombre: string;
            precio: number;
            moneda: string;
            imagen_url: string | null;
            descripcion: string | null;
            seccion_id: number | null;
            seccion: string | null;
        }[];
        secciones: {
            id: number;
            nombre: string;
            padre_id: number | null;
        }[];
    }>;
    private aProducto;
    private aInstalacion;
    obtenerSecciones(): Promise<{
        secciones: {
            id: number;
            nombre: string;
            padre_id: number | null;
        }[];
    }>;
    crearSeccion(createSeccionDto: CreateSeccionDto): Promise<{
        mensaje: string;
        seccion: import("../common/entities/seccion.entity.js").Seccion;
    }>;
    actualizarSeccion(id: number, updateSeccionDto: UpdateSeccionDto): Promise<{
        mensaje: string;
        seccion: import("../common/entities/seccion.entity.js").Seccion;
    }>;
    eliminarSeccion(id: number): Promise<{
        ok: boolean;
    }>;
    crearProducto(createDulceDto: CreateDulceDto): Promise<{
        mensaje: string;
        producto: {
            id: number;
            nombre: string;
            precio: number;
            moneda: string;
            imagen_url: string | null;
            descripcion: string | null;
            seccion_id: number | null;
            seccion: string | null;
        };
    }>;
    actualizarProducto(id: number, updateDulceDto: UpdateDulceDto): Promise<{
        mensaje: string;
        producto: {
            id: number;
            nombre: string;
            precio: number;
            moneda: string;
            imagen_url: string | null;
            descripcion: string | null;
            seccion_id: number | null;
            seccion: string | null;
        };
    }>;
    eliminarProducto(id: number, request: RequestConUsuario): Promise<{
        ok: boolean;
    }>;
    subirImagen(id: number, file: MulterFile | undefined, request: RequestConUsuario): Promise<{
        mensaje: string;
        producto: import("../common/entities/dulce.entity.js").Dulce;
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    eliminarImagen(id: number, request: RequestConUsuario): Promise<{
        mensaje: string;
        producto: import("../common/entities/dulce.entity.js").Dulce;
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    obtenerInstalaciones(): Promise<{
        instalaciones: {
            id: number;
            nombre_servicio: string;
            precio: number;
            moneda: string;
            imagen_url: string | null;
            descripcion: string[];
        }[];
    }>;
    crearInstalacion(createInstalacionDto: CreateInstalacionDto): Promise<{
        mensaje: string;
        instalacion: {
            id: number;
            nombre_servicio: string;
            precio: number;
            moneda: string;
            imagen_url: string | null;
            descripcion: string[];
        };
    }>;
    actualizarInstalacion(id: number, updateInstalacionDto: UpdateInstalacionDto): Promise<{
        mensaje: string;
        instalacion: {
            id: number;
            nombre_servicio: string;
            precio: number;
            moneda: string;
            imagen_url: string | null;
            descripcion: string[];
        };
    }>;
    eliminarInstalacion(id: number, request: RequestConUsuario): Promise<{
        mensaje: string;
    }>;
    subirImagenInstalacion(id: number, file: MulterFile | undefined, request: RequestConUsuario): Promise<{
        mensaje: string;
        instalacion: {
            id: number;
            nombre_servicio: string;
            precio: number;
            moneda: string;
            imagen_url: string | null;
            descripcion: string[];
        };
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    eliminarImagenInstalacion(id: number, request: RequestConUsuario): Promise<{
        mensaje: string;
        instalacion: {
            id: number;
            nombre_servicio: string;
            precio: number;
            moneda: string;
            imagen_url: string | null;
            descripcion: string[];
        };
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    agregarPedido(createPedidoDto: CreatePedidoDto): Promise<{
        ok: boolean;
        pedido: import("../common/entities/pedido.entity.js").Pedido;
    }>;
    obtenerPedidos(pagina?: number, limite?: number): Promise<{
        pedidos: import("../common/entities/pedido.entity.js").Pedido[];
    }>;
    obtenerPedido(id: string): Promise<import("../common/entities/pedido.entity.js").Pedido>;
    borrarPedido(id: string): Promise<{
        ok: boolean;
    }>;
}
