import { describe, expect, it } from 'vitest';
import { toPage } from './page';
import { parsePageable, unpagedSchema } from './pageable';

describe('toPage', () => {
  it('usa o envelope com metadados aninhados em `page`, como o MatPaginator espera', () => {
    const envelope = toPage([{ id: 1 }], { page: 0, size: 5 }, 12);

    expect(envelope).toEqual({
      content: [{ id: 1 }],
      page: { size: 5, number: 0, totalElements: 12, totalPages: 3 },
    });
  });

  it('não expõe totalElements na raiz, formato que quebraria o paginador', () => {
    expect(toPage([], { page: 0, size: 20 }, 0)).not.toHaveProperty('totalElements');
  });

  it('calcula zero páginas quando não há resultados', () => {
    expect(toPage([], { page: 0, size: 10 }, 0).page.totalPages).toBe(0);
  });
});

describe('parsePageable', () => {
  it('aplica os defaults do Spring quando os parâmetros não vêm', () => {
    expect(parsePageable({})).toEqual({ page: 0, size: 20 });
  });

  it('converte os valores de query string', () => {
    expect(parsePageable({ page: '2', size: '5' })).toEqual({ page: 2, size: 5 });
  });

  it('cai no default em valores inválidos, em vez de responder 400', () => {
    expect(parsePageable({ page: 'abc', size: '-1' })).toEqual({ page: 0, size: 20 });
  });
});

describe('unpagedSchema', () => {
  it('reconhece a string "true" que chega na query string', () => {
    expect(unpagedSchema.parse('true')).toBe(true);
    expect(unpagedSchema.parse('false')).toBe(false);
  });

  it('trata ausência e lixo como paginado', () => {
    expect(unpagedSchema.parse(undefined)).toBe(false);
    expect(unpagedSchema.parse('sim')).toBe(false);
  });
});
