import { Document } from 'mongodb';

const SORT_FIELD = '_sortAt';

/**
 * Todas as listagens do backend Java ordenam por `GREATEST(updatedAt, createdAt) DESC`,
 * imposto via `query.orderBy(...)` nas Specifications — o que faz o `?sort=` enviado pelo
 * cliente ser ignorado. O comportamento é preservado aqui.
 *
 * O desempate por `_id` decrescente evita ordem instável entre registros criados no mesmo
 * instante, comum nos dados migrados, onde `createdAt` é idêntico em lotes inteiros.
 */
export function recencySortStages(): Document[] {
  return [
    { $addFields: { [SORT_FIELD]: { $max: ['$updatedAt', '$createdAt'] } } },
    { $sort: { [SORT_FIELD]: -1, _id: -1 } },
    { $unset: SORT_FIELD },
  ];
}

/** Estágios de recorte de página, sempre aplicados depois da ordenação. */
export function paginationStages(page: number, size: number): Document[] {
  return [{ $skip: page * size }, { $limit: size }];
}
