import {
  addWeeks,
  combineDateAndTime,
  nextOrSameWeekday,
  startOfUtcDay,
} from '../common/date/local-date-time';

export interface OccurrenceSlot {
  start: Date;
  end: Date;
}

/**
 * Expande uma reserva fixa nas ocorrências concretas.
 *
 * `start` e `end` delimitam o período da recorrência e, ao mesmo tempo, definem o
 * horário de cada ocorrência: a data vem da varredura semanal e a hora vem desses dois
 * extremos. `weekdays` usa o padrão ISO (1 = segunda, 7 = domingo).
 *
 * Dias repetidos geram ocorrências duplicadas, que a validação de sobreposição depois
 * rejeita — comportamento herdado do Java e mantido de propósito.
 */
export function buildOccurrenceSlots(
  start: Date,
  end: Date,
  weekdays: number[],
): OccurrenceSlot[] {
  const firstDay = startOfUtcDay(start);
  const lastDay = startOfUtcDay(end);
  const slots: OccurrenceSlot[] = [];

  for (const weekday of [...weekdays].sort((a, b) => a - b)) {
    let occurrence = nextOrSameWeekday(firstDay, weekday);

    while (occurrence.getTime() <= lastDay.getTime()) {
      slots.push({
        start: combineDateAndTime(occurrence, start),
        end: combineDateAndTime(occurrence, end),
      });
      occurrence = addWeeks(occurrence, 1);
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Conflito de horário usa intervalo semiaberto: `existente.inicio < fim` e
 * `existente.fim > inicio`. Reservas encostadas (uma termina às 10:00 e a outra começa
 * às 10:00) **não** conflitam.
 */
export function overlaps(a: OccurrenceSlot, b: OccurrenceSlot): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}
