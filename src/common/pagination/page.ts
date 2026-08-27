import { Pageable } from './pageable';

/**
 * Envelope de paginação do Spring Boot com `pageSerializationMode = VIA_DTO`.
 *
 * Atenção: NÃO é o `Page<T>` clássico com `totalElements` na raiz. O `MatPaginator` do
 * Angular lê `page.totalElements`, `page.size` e `page.number`; o formato antigo faria
 * o paginador exibir zero itens sem erro nenhum.
 */
export interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PageEnvelope<T> {
  content: T[];
  page: PageMetadata;
}

export function toPage<T>(content: T[], pageable: Pageable, totalElements: number): PageEnvelope<T> {
  return {
    content,
    page: {
      size: pageable.size,
      number: pageable.page,
      totalElements,
      totalPages: pageable.size > 0 ? Math.ceil(totalElements / pageable.size) : 0,
    },
  };
}
