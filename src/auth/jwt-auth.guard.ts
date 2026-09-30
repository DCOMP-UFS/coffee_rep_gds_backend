import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AuthorizationDeniedError } from '../common/errors/domain-errors';
import { UsersRepository } from '../users/users.repository';
import { AUTHORITIES_KEY } from './authorities.decorator';
import { setAuthenticatedUser } from './current-user';
import { PERMISSION_DENIED_MESSAGE, Permission, hasPermission } from './permissions';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PERMISSIONS_KEY } from './require-permission.decorator';
import { resolveRole } from './roles';
import { TokenService } from './token.service';
import { UnauthenticatedError } from './unauthenticated.error';

/**
 * Equivale ao resource server OAuth2 do Java combinado com `@PreAuthorize`: por padrão
 * toda rota exige um Bearer token válido, e `@Public()` abre exceções.
 *
 * O token só identifica o usuário. O perfil é lido do banco a cada requisição, então uma
 * promoção ou um rebaixamento vale na hora, sem esperar o token expirar.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = await this.authenticate(context, request);

    const user = await this.users.findById(userId);
    if (!user) {
      this.challenge(context);
      throw new UnauthenticatedError();
    }

    const role = resolveRole(user.roles);
    const authorities = [`SCOPE_${role}`];
    setAuthenticatedUser(request, { userId, role, authorities });

    const requiredAuthorities = this.reflector.getAllAndOverride<string[]>(AUTHORITIES_KEY, targets);
    if (
      requiredAuthorities?.length &&
      !requiredAuthorities.some((authority) => authorities.includes(authority))
    ) {
      throw new AuthorizationDeniedError('Access Denied');
    }

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      targets,
    );
    if (requiredPermissions?.some((permission) => !hasPermission(role, permission))) {
      throw new AuthorizationDeniedError(PERMISSION_DENIED_MESSAGE);
    }

    return true;
  }

  /** Valida o Bearer token e devolve o id do usuário (claim `sub`). */
  private async authenticate(context: ExecutionContext, request: Request): Promise<number> {
    const token = extractBearerToken(request);
    let userId = Number.NaN;

    if (token) {
      try {
        const claims = await this.tokenService.verify(token);
        userId = Number.parseInt(claims.sub, 10);
      } catch {
        userId = Number.NaN;
      }
    }

    if (!Number.isInteger(userId)) {
      this.challenge(context);
      throw new UnauthenticatedError();
    }

    return userId;
  }

  /** Cabeçalho que o Spring Security devolve junto do 401. */
  private challenge(context: ExecutionContext): void {
    context.switchToHttp().getResponse<Response>().setHeader('WWW-Authenticate', 'Bearer');
  }
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header) return null;

  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value : null;
}
