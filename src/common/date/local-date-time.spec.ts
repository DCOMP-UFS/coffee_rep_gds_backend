import { describe, expect, it } from 'vitest';
import {
  combineDateAndTime,
  formatLocalDate,
  formatLocalDateTime,
  isoWeekday,
  nextOrSameWeekday,
  parseLocalDate,
  parseLocalDateTime,
  startOfUtcDay,
} from './local-date-time';

describe('formatLocalDateTime', () => {
  it('serializa sem fuso, no formato do LocalDateTime do Java', () => {
    const date = new Date(Date.UTC(2026, 5, 2, 7, 0, 0));
    expect(formatLocalDateTime(date)).toBe('2026-06-02T07:00:00');
  });

  it('nunca emite sufixo Z, que deslocaria o calendário do frontend', () => {
    const formatted = formatLocalDateTime(new Date(Date.UTC(2026, 0, 1, 23, 59, 59)));
    expect(formatted).toBe('2026-01-01T23:59:59');
    expect(formatted).not.toContain('Z');
  });

  it('devolve null para datas ausentes, para o interceptor de nulos removê-las', () => {
    expect(formatLocalDateTime(null)).toBeNull();
    expect(formatLocalDateTime(undefined)).toBeNull();
  });
});

describe('formatLocalDate', () => {
  it('serializa apenas a data', () => {
    expect(formatLocalDate(new Date(Date.UTC(2026, 7, 27, 15, 30)))).toBe('2026-08-27');
  });
});

describe('parseLocalDateTime', () => {
  it('aceita o formato com segundos que o frontend usa nos filtros', () => {
    expect(parseLocalDateTime('2026-06-02T00:00:00')?.toISOString()).toBe(
      '2026-06-02T00:00:00.000Z',
    );
  });

  it('aceita o formato sem segundos que o frontend usa ao criar reserva', () => {
    expect(parseLocalDateTime('2026-06-02T07:30')?.toISOString()).toBe('2026-06-02T07:30:00.000Z');
  });

  it('preserva o horário de parede em vez de converter para o fuso do servidor', () => {
    const parsed = parseLocalDateTime('2026-06-02T07:00:00')!;
    expect(formatLocalDateTime(parsed)).toBe('2026-06-02T07:00:00');
  });

  it('rejeita entradas inválidas e datas inexistentes', () => {
    expect(parseLocalDateTime('02/06/2026')).toBeNull();
    expect(parseLocalDateTime('2026-02-31T10:00:00')).toBeNull();
    expect(parseLocalDateTime('')).toBeNull();
  });
});

describe('parseLocalDate', () => {
  it('devolve a meia-noite UTC do dia', () => {
    expect(parseLocalDate('2026-08-27')?.toISOString()).toBe('2026-08-27T00:00:00.000Z');
  });

  it('rejeita formato com hora', () => {
    expect(parseLocalDate('2026-08-27T10:00')).toBeNull();
  });
});

describe('isoWeekday', () => {
  it('usa 1 para segunda e 7 para domingo, como o DayOfWeek do Java', () => {
    expect(isoWeekday(new Date(Date.UTC(2026, 7, 24)))).toBe(1);
    expect(isoWeekday(new Date(Date.UTC(2026, 7, 30)))).toBe(7);
  });
});

describe('nextOrSameWeekday', () => {
  it('mantém a data quando ela já cai no dia pedido', () => {
    const monday = new Date(Date.UTC(2026, 7, 24));
    expect(nextOrSameWeekday(monday, 1)).toEqual(monday);
  });

  it('avança para a próxima ocorrência do dia da semana', () => {
    const monday = new Date(Date.UTC(2026, 7, 24));
    expect(formatLocalDate(nextOrSameWeekday(monday, 4))).toBe('2026-08-27');
  });

  it('avança para a semana seguinte quando o dia já passou', () => {
    const thursday = new Date(Date.UTC(2026, 7, 27));
    expect(formatLocalDate(nextOrSameWeekday(thursday, 1))).toBe('2026-08-31');
  });
});

describe('startOfUtcDay', () => {
  it('zera a hora sem mudar o dia', () => {
    expect(formatLocalDateTime(startOfUtcDay(new Date(Date.UTC(2026, 7, 27, 18, 45))))).toBe(
      '2026-08-27T00:00:00',
    );
  });
});

describe('combineDateAndTime', () => {
  it('junta a data de um com a hora do outro', () => {
    const date = new Date(Date.UTC(2026, 7, 31, 0, 0));
    const time = new Date(Date.UTC(2026, 5, 2, 7, 30, 15));
    expect(formatLocalDateTime(combineDateAndTime(date, time))).toBe('2026-08-31T07:30:15');
  });
});
