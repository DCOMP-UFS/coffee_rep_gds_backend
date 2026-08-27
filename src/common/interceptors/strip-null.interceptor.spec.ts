import { describe, expect, it } from 'vitest';
import { stripNulls } from './strip-null.interceptor';

describe('stripNulls', () => {
  it('remove propriedades nulas e indefinidas', () => {
    expect(stripNulls({ id: 1, nome: 'Sala', telefone: null, obs: undefined })).toEqual({
      id: 1,
      nome: 'Sala',
    });
  });

  it('replica a resposta de reserva recorrente, que só expõe três campos', () => {
    const recurrent = {
      id: null,
      startDate: null,
      endDate: null,
      requesterName: 'Dra. Ana Souza',
      roomName: 'Pediatria - Sala 01',
      recurrenceId: 57,
    };

    expect(stripNulls(recurrent)).toEqual({
      requesterName: 'Dra. Ana Souza',
      roomName: 'Pediatria - Sala 01',
      recurrenceId: 57,
    });
  });

  it('percorre objetos aninhados e arrays', () => {
    const page = {
      content: [{ id: 1, criador: null }],
      page: { size: 5, number: 0, totalElements: 1, totalPages: 1 },
    };

    expect(stripNulls(page)).toEqual({
      content: [{ id: 1 }],
      page: { size: 5, number: 0, totalElements: 1, totalPages: 1 },
    });
  });

  it('preserva valores falsy que não são nulos', () => {
    expect(stripNulls({ ocupada: false, total: 0, nome: '' })).toEqual({
      ocupada: false,
      total: 0,
      nome: '',
    });
  });

  it('não desmonta instâncias de Date', () => {
    const date = new Date('2026-06-02T07:00:00.000Z');
    expect(stripNulls({ createdAt: date }).createdAt).toBeInstanceOf(Date);
  });

  it('mantém arrays vazios, que o frontend usa como lista sem resultados', () => {
    expect(stripNulls({ content: [] })).toEqual({ content: [] });
  });
});
