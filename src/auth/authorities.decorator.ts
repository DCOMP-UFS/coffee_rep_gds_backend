import { SetMetadata } from '@nestjs/common';

export const AUTHORITIES_KEY = 'requiredAuthorities';

/**
 * Equivale a `@PreAuthorize("hasAnyAuthority(...)")`. Basta uma das authorities.
 * Use os nomes já prefixados, como `SCOPE_ADMIN`.
 */
export const Authorities = (...authorities: string[]) => SetMetadata(AUTHORITIES_KEY, authorities);
