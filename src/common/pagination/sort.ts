import { Document } from 'mongodb';
import { recencySortStages } from './sort-stages';

export type SortDirection = 1 | -1;

export interface SortSpec {
  /** Caminho do campo no pipeline (ex.: `name`, `section.name`). */
  field: string;
  direction: SortDirection;
}

/** Nome do campo na API (como aparece na resposta) → caminho no pipeline. */
export type SortableFields = Readonly<Record<string, string>>;

/** Formato do `Pageable` do Spring: `campo,asc` ou `campo,desc`. */
const SORT_PATTERN = /^([A-Za-z]+),(asc|desc)$/i;

/**
 * Ordem alfabética do português: ignora maiúsculas e acentos ("Ágata" junto de "agenda").
 * Só afeta ordenação e igualdade de strings; os filtros por `$regex` não mudam.
 */
export const PT_COLLATION = { locale: 'pt', strength: 1 } as const;

/**
 * Lê o `?sort=` do cliente. Campo fora da lista, direção inválida ou parâmetro repetido
 * valem como ausentes: a listagem mantém a ordem padrão em vez de responder 400.
 */
export function parseSort(raw: unknown, fields: SortableFields): SortSpec | null {
  if (typeof raw !== 'string') return null;

  const match = SORT_PATTERN.exec(raw.trim());
  if (!match) return null;

  const [, apiField, direction] = match;
  if (!Object.hasOwn(fields, apiField)) return null;

  return { field: fields[apiField], direction: direction.toLowerCase() === 'asc' ? 1 : -1 };
}

/**
 * Ordenação pedida pelo cliente, com desempate por `_id` para a ordem não variar entre
 * páginas; sem pedido, a ordem por recência de sempre.
 */
export function sortStages(sort: SortSpec | null): Document[] {
  if (!sort) return recencySortStages();
  return [{ $sort: { [sort.field]: sort.direction, _id: sort.direction } }];
}
