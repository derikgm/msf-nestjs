import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { ROL_SUPERUSUARIO, Usuario, type RolUsuario } from './entities/index.js';
import { AuthUser } from './auth.interfaces.js';
import { HASH_FICTICIO, hashPassword, verifyPassword } from './password.util.js';
import { parseDurationToSeconds } from '../common/utils/duration.util.js';

@Injectable()
export class AuthService {
  private readonly expiresIn: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(getRepositoryToken(Usuario))
    private readonly usuarioRepo: Repository<Usuario>,
  ) {
    this.expiresIn = parseDurationToSeconds(
      config.get<string>('AUTH_JWT_EXPIRES_IN') ?? '8h',
    );
  }

  /** Valida la contraseña contra la base de datos y devuelve un token. */
  async login(dto: LoginDto) {
    const usuario = await this.buscarPorNombre(dto.usuario);
    const passwordOk = verifyPassword(
      dto.password,
      usuario?.password_hash ?? HASH_FICTICIO,
    );

    if (!usuario || !passwordOk || !usuario.activo) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    return {
      // Sin la segunda palabra, el JWT salía **sin claim `exp`**: el token no
      // caducaba nunca y el `expires_in` de la respuesta era decorativo (N-1).
      // `expiresIn` en segundos es lo que ya calculaba `parseDurationToSeconds`
      // para ese campo, así que la respuesta y el token dicen lo mismo.
      access_token: await this.jwtService.signAsync(
        {
          sub: usuario.id,
          usuario: usuario.usuario,
          rol: usuario.rol,
        },
        { expiresIn: this.expiresIn },
      ),
      token_type: 'Bearer',
      expires_in: this.expiresIn,
    };
  }

  /**
   * Alta de usuarios.
   *
   * - Mientras un rol no tenga ningún usuario, cualquiera puede crear su primer
   *   usuario (así el proyecto arranca sin necesitar una clave en el servidor).
   * - Si el rol ya existe, hace falta token: ver crearUsuario().
   */
  async register(dto: CreateUsuarioDto, caller?: AuthUser) {
    const rol = caller?.rol ?? dto.rol ?? 'delys';

    // Sin token esta ruta es pública y solo sirve para arrancar un proyecto
    // nuevo; **nunca** para el superusuario (N-2). Como el rol `admin` no tiene
    // ningún usuario, cualquiera podía darse de alta como admin desde fuera y
    // ya podía crear usuarios, leer los dos catálogos y cambiar cualquier cosa.
    // El admin se da de alta con token de admin o desde el servidor: aquí se
    // rechaza antes de mirar si el rol está vacío, para que el motivo sea claro.
    if (!caller && rol === ROL_SUPERUSUARIO) {
      throw new ForbiddenException(
        'El rol admin no se da de alta por el registro público: créalo con POST /auth/admin/usuarios (hace falta token de admin) o desde el servidor',
      );
    }

    const yaHayUsuarios = await this.hayUsuariosDelRol(rol);

    if (yaHayUsuarios && caller?.rol !== rol) {
      throw new UnauthorizedException(
        'El registro está cerrado: pídele a un usuario de ese rol que te cree la cuenta',
      );
    }

    return this.crear(dto, rol);
  }

  /** Crea un usuario dentro del propio rol del que llama. */
  async crearUsuario(dto: CreateUsuarioDto, caller: AuthUser) {
    return this.crear(dto, caller.rol);
  }

  /**
   * Alta que solo puede hacer un administrador: el rol se manda en el cuerpo y
   * no sale del token.
   *
   * `RolesGuard` ya restringe la ruta a `admin` (`@Roles(ROL_SUPERUSUARIO)`); la
   * comprobación de aquí es por si este método se expone sin el guard: crear
   * usuarios de un proyecto ajeno es justo lo que el aislamiento de roles evita.
   */
  async crearUsuarioAdmin(dto: CreateUsuarioAdminDto, caller: AuthUser) {
    if (caller.rol !== ROL_SUPERUSUARIO) {
      throw new ForbiddenException('Solo un administrador puede asignar roles');
    }

    return this.crear(dto, dto.rol);
  }

  /** Lista todos los usuarios ordenados por fecha de creación. */
  async listarUsuarios() {
    const usuarios = await this.usuarioRepo.find({
      order: { creado_en: 'DESC' },
      select: {
        id: true,
        nombre: true,
        usuario: true,
        rol: true,
        activo: true,
        creado_en: true,
      },
    });

    return { usuarios };
  }

  /** Actualiza rol y/o activo de un usuario. */
  async actualizarUsuario(id: string, dto: UpdateUsuarioDto, caller: AuthUser) {
    if (caller.rol !== ROL_SUPERUSUARIO) {
      throw new ForbiddenException('Solo un administrador puede gestionar usuarios');
    }

    const usuario = await this.buscarPorId(id);

    if (!usuario) {
      throw new NotFoundException('No existe el usuario ' + id);
    }

    if (dto.rol !== undefined) {
      usuario.rol = dto.rol;
    }

    if (dto.activo !== undefined) {
      usuario.activo = dto.activo;
    }

    await this.usuarioRepo.save(usuario);

    const { password_hash, ...resto } = usuario as Usuario;
    return { mensaje: 'Usuario actualizado', usuario: resto };
  }

  /** Elimina un usuario por su id. */
  async eliminarUsuario(id: string, caller: AuthUser) {
    if (caller.rol !== ROL_SUPERUSUARIO) {
      throw new ForbiddenException('Solo un administrador puede gestionar usuarios');
    }

    const usuario = await this.buscarPorId(id);

    if (!usuario) {
      throw new NotFoundException('No existe el usuario ' + id);
    }

    await this.usuarioRepo.delete(id);

    return { mensaje: 'Usuario eliminado' };
  }

  /** Cada usuario cambia su propia contraseña. */
  async changePassword(caller: AuthUser, dto: ChangePasswordDto) {
    const usuario = await this.buscarPorId(caller.sub);

    if (!usuario) throw new UnauthorizedException('El usuario ya no existe');

    if (!verifyPassword(dto.password_actual, usuario.password_hash)) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    usuario.password_hash = hashPassword(dto.password_nueva);

    await this.usuarioRepo.save(usuario);

    return { mensaje: 'Contraseña actualizada correctamente' };
  }

  /** El guard lo consulta en cada petición: un usuario desactivado pierde el acceso al instante. */
  async usuarioActivo(id: string) {
    return this.usuarioRepo.existsBy({ id, activo: true });
  }

  private async crear(dto: CreateUsuarioDto, rol: RolUsuario) {
    const usuario = dto.usuario.trim().toLowerCase();

    if (await this.usuarioRepo.existsBy({ usuario })) {
      throw new ConflictException('Ese nombre de usuario ya existe');
    }

    const nuevo = await this.usuarioRepo.save(
      this.usuarioRepo.create({
        nombre: dto.nombre.trim(),
        usuario,
        password_hash: hashPassword(dto.password),
        rol,
      }),
    );

    return {
      mensaje: 'Usuario creado correctamente',
      usuario: {
        id: nuevo.id,
        nombre: nuevo.nombre,
        usuario: nuevo.usuario,
        rol: nuevo.rol,
      },
    };
  }

  private async buscarPorNombre(usuario: string) {
    // addSelect: password_hash es select:false y no viene en la consulta por defecto.
    return this.usuarioRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.password_hash')
      .where('usuario.usuario = :usuario', {
        usuario: usuario.trim().toLowerCase(),
      })
      .getOne();
  }

  private async buscarPorId(id: string) {
    return this.usuarioRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.password_hash')
      .where('usuario.id = :id', { id })
      .getOne();
  }

  private async hayUsuariosDelRol(rol: RolUsuario) {
    return this.usuarioRepo.existsBy({ rol });
  }
}
