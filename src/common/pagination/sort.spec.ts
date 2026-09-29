import { describe, expect, it } from 'vitest';
import { parseSort, sortStages } from './sort';
import { recencySortStages } from './sort-stages';

const FIELDS = { nome: 'name', setor: 'section.name' };

describe('parseSort', () => {
  it('traduz o campo da API para o caminho no pipeline', () => {
    expect(parseSort('nome,asc', FIELDS)).toEqual({ field: 'name', direction: 1 });
    expect(parseSort('setor,desc', FIELDS)).toEqual({ field: 'section.name', direction: -1 });
  });

  it('aceita a direção em maiúsculas e espaços nas pontas', () => {
    expect(parseSort(' nome,DESC ', FIELDS)).toEqual({ field: 'name', direction: -1 });
  });

  it('ignora campo fora da lista, inclusive propriedades herdadas do objeto', () => {
    expect(parseSort('senha,asc', FIELDS)).toBeNull();
    expect(parseSort('constructor,asc', FIELDS)).toBeNull();
  });

  it('ignora formato inválido, ausência e parâmetro repetido', () => {
    expect(parseSort('nome', FIELDS)).toBeNull();
    expect(parseSort('nome,up', FIELDS)).toBeNull();
    expect(parseSort('', FIELDS)).toBeNull();
    expect(parseSort(undefined, FIELDS)).toBeNull();
    expect(parseSort(['nome,asc', 'setor,desc'], FIELDS)).toBeNull();
  });
});

describe('sortStages', () => {
  it('ordena pelo campo pedido, com desempate por _id na mesma direção', () => {
    expect(sortStages({ field: 'name', direction: 1 })).toEqual([
      { $sort: { name: 1, _id: 1 } },
    ]);
  });

  it('mantém a ordem por recência quando não há pedido', () => {
    expect(sortStages(null)).toEqual(recencySortStages());
  });
});
