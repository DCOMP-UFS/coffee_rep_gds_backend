import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Dispensa o JWT na rota. Equivale ao `permitAll()` do `SecurityConfig` do Java, que
 * libera `POST /api/auth/**`, `GET /hello` e `GET /api/health`.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
