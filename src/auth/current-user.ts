import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Identidade extraída do JWT. As authorities recebem o prefixo `SCOPE_`, como o Spring
 * faz ao derivá-las do claim `scope`.
 */
export interface AuthenticatedUser {
  userId: number;
  authorities: string[];
}

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
