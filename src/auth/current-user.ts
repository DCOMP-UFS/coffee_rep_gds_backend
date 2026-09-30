import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from './roles';

/**
 * Identidade da requisição: o id vem do JWT, mas o perfil é relido do banco a cada
 * requisição para que promoções e rebaixamentos valham sem novo login. As authorities
 * recebem o prefixo `SCOPE_`, como o Spring faz ao derivá-las do claim `scope`.
 */
export interface AuthenticatedUser {
  userId: number;
  role: Role;
  authorities: string[];
}

/** Quem executa uma ação de negócio que depende do perfil. */
export type Actor = Pick<AuthenticatedUser, 'userId' | 'role'>;

export const REQUEST_USER_KEY = 'authenticatedUser';

export function getAuthenticatedUser(request: Request): AuthenticatedUser | undefined {
  return (request as Request & Record<string, unknown>)[REQUEST_USER_KEY] as
    | AuthenticatedUser
    | undefined;
}

export function setAuthenticatedUser(request: Request, user: AuthenticatedUser): void {
  (request as Request & Record<string, unknown>)[REQUEST_USER_KEY] = user;
}

/** Equivale ao `CurrentUserUtils.getCurrentUserID()` do Java. */
export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>();
  return getAuthenticatedUser(request)?.userId;
});

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>();
  return getAuthenticatedUser(request);
});
