import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AuthorizationDeniedError } from '../common/errors/domain-errors';
import { AUTHORITIES_KEY } from './authorities.decorator';
import { setAuthenticatedUser } from './current-user';
import { IS_PUBLIC_KEY } from './public.decorator';
import { TokenService } from './token.service';
import { UnauthenticatedError } from './unauthenticated.error';

/**
 * Equivale ao resource server OAuth2 do Java combinado com `@PreAuthorize`: por padrão
 * toda rota exige um Bearer token válido, e `@Public()` abre exceções.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);

    if (!token) {
      this.challenge(context);
      throw new UnauthenticatedError();
    }

    let userId: number;
    let authorities: string[];

    try {
      const claims = await this.tokenService.verify(token);
      userId = Number.parseInt(claims.sub, 10);
      authorities = claims.scope
        .split(' ')
        .filter(Boolean)
        .map((scope) => `SCOPE_${scope}`);
    } catch {
      this.challenge(context);
      throw new UnauthenticatedError();
    }

    if (!Number.isInteger(userId)) {
      this.challenge(context);
      throw new UnauthenticatedError();
    }

    setAuthenticatedUser(request, { userId, authorities });

    const required = this.reflector.getAllAndOverride<string[]>(AUTHORITIES_KEY, targets);
    if (required?.length && !required.some((authority) => authorities.includes(authority))) {
      throw new AuthorizationDeniedError('Access Denied');
    }

    return true;
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
