import { describe, expect, it } from 'vitest';
import { formatLocalDateTime, parseLocalDateTime } from '../common/date/local-date-time';
import { buildOccurrenceSlots, overlaps } from './recurrence';

const parse = (value: string): Date => parseLocalDateTime(value)!;

function slotsFor(start: string, end: string, weekdays: number[]): string[] {
  return buildOccurrenceSlots(parse(start), parse(end), weekdays).map(
    (slot) => `${formatLocalDateTime(slot.start)} / ${formatLocalDateTime(slot.end)}`,
  );
}

describe('buildOccurrenceSlots', () => {
  it('repete o horário nas segundas dentro do período', () => {
    // 2026-08-24 é uma segunda-feira.
    expect(slotsFor('2026-08-24T08:00:00', '2026-09-07T10:00:00', [1])).toEqual([
      '2026-08-24T08:00:00 / 2026-08-24T10:00:00',
      '2026-08-31T08:00:00 / 2026-08-31T10:00:00',
      '2026-09-07T08:00:00 / 2026-09-07T10:00:00',
    ]);
  });

  it('mantém a hora de cada ocorrência vinda dos extremos do período', () => {
    const slots = buildOccurrenceSlots(
      parse('2026-08-24T14:30:00'),
      parse('2026-09-07T16:45:00'),
      [1],
    );

    expect(formatLocalDateTime(slots[0].start)).toBe('2026-08-24T14:30:00');
    expect(formatLocalDateTime(slots[0].end)).toBe('2026-08-24T16:45:00');
  });

  it('intercala vários dias da semana em ordem cronológica', () => {
    expect(slotsFor('2026-08-24T08:00:00', '2026-09-01T09:00:00', [4, 1])).toEqual([
      '2026-08-24T08:00:00 / 2026-08-24T09:00:00',
      '2026-08-27T08:00:00 / 2026-08-27T09:00:00',
      '2026-08-31T08:00:00 / 2026-08-31T09:00:00',
    ]);
  });

  it('inclui o próprio dia inicial quando ele já é o dia da semana pedido', () => {
    expect(slotsFor('2026-08-24T08:00:00', '2026-08-24T09:00:00', [1])).toHaveLength(1);
  });

  it('inclui o último dia do período', () => {
    expect(slotsFor('2026-08-24T08:00:00', '2026-08-31T09:00:00', [1])).toHaveLength(2);
  });

  it('devolve lista vazia quando o dia da semana não cabe no período', () => {
    // Terça a quinta não contém domingo.
    expect(slotsFor('2026-08-25T08:00:00', '2026-08-27T09:00:00', [7])).toEqual([]);
  });

  it('usa 7 para domingo, como o DayOfWeek do Java', () => {
    expect(slotsFor('2026-08-24T08:00:00', '2026-08-30T09:00:00', [7])).toEqual([
      '2026-08-30T08:00:00 / 2026-08-30T09:00:00',
    ]);
  });

  it('duplica ocorrências quando o mesmo dia é enviado duas vezes', () => {
    expect(slotsFor('2026-08-24T08:00:00', '2026-08-24T09:00:00', [1, 1])).toHaveLength(2);
  });

  it('devolve lista vazia sem dias da semana', () => {
    expect(slotsFor('2026-08-24T08:00:00', '2026-09-07T10:00:00', [])).toEqual([]);
  });
});

describe('overlaps', () => {
  const slot = (start: string, end: string) => ({ start: parse(start), end: parse(end) });

  it('detecta sobreposição parcial', () => {
    expect(
      overlaps(slot('2026-08-24T08:00:00', '2026-08-24T10:00:00'), slot('2026-08-24T09:00:00', '2026-08-24T11:00:00')),
    ).toBe(true);
  });

  it('detecta um intervalo contido no outro', () => {
    expect(
      overlaps(slot('2026-08-24T08:00:00', '2026-08-24T12:00:00'), slot('2026-08-24T09:00:00', '2026-08-24T10:00:00')),
    ).toBe(true);
  });

  it('não considera conflito quando os intervalos apenas se encostam', () => {
    expect(
      overlaps(slot('2026-08-24T08:00:00', '2026-08-24T10:00:00'), slot('2026-08-24T10:00:00', '2026-08-24T12:00:00')),
    ).toBe(false);
  });

  it('não considera conflito entre intervalos separados', () => {
    expect(
      overlaps(slot('2026-08-24T08:00:00', '2026-08-24T09:00:00'), slot('2026-08-24T10:00:00', '2026-08-24T11:00:00')),
    ).toBe(false);
  });
});
