import { z } from 'zod';

/** Defaults do `Pageable` do Spring Data. */
const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 20;

export interface Pageable {
  page: number;
  size: number;
}

/**
 * O Spring ignora valores inválidos e cai no default em vez de responder 400, e o
 * frontend depende disso ao enviar `size` vazio em alguns fluxos.
 */
export const pageableSchema = z
  .object({
    page: z.coerce.number().int().min(0).catch(DEFAULT_PAGE).default(DEFAULT_PAGE),
    size: z.coerce.number().int().min(1).catch(DEFAULT_SIZE).default(DEFAULT_SIZE),
  })
  .transform((value): Pageable => value);

/**
 * `unpaged=true` troca o envelope paginado por um array puro. O frontend usa isso para
 * popular selects, e em `requester` e `requester-absence` ele espera array e nada mais.
 */
export const unpagedSchema = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .catch(false)
  .transform((value) => value === true || value === 'true');

export function parsePageable(query: Record<string, unknown>): Pageable {
  return pageableSchema.parse({ page: query.page, size: query.size });
}
