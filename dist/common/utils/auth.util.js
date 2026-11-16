import { UnauthorizedException } from '@nestjs/common';
export function usuarioActual(request) {
    if (!request.user)
        throw new UnauthorizedException();
    return request.user;
}
//# sourceMappingURL=auth.util.js.map