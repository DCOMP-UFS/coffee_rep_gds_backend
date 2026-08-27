import { BadParametersError } from '../errors/domain-errors';

/**
 * O backend Java trafega `LocalDateTime`/`LocalDate`: horário de parede, sem fuso.
 * O dump foi importado preservando esse horário de parede em UTC, então toda
 * conversão aqui usa os componentes UTC do `Date`.
 *
 * Emitir um sufixo `Z` deslocaria o calendário do frontend em 3 horas, porque o
 * Angular faz `new Date(horaInicio)` e uma string sem fuso é interpretada como
 * horário local do navegador.
 */

const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** Serializa como `yyyy-MM-ddTHH:mm:ss`, sem fuso. */
export function formatLocalDateTime(date: Date | null | undefined): string | null {
  if (!date) return null;
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/** Serializa como `yyyy-MM-dd`, sem fuso. */
export function formatLocalDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * Aceita `yyyy-MM-ddTHH:mm`, `yyyy-MM-ddTHH:mm:ss` e frações de segundo, com ou sem
 * `T`. O frontend envia os dois primeiros formatos (filtros com segundos, criação sem).
 */
export function parseLocalDateTime(value: string): Date | null {
  const match = DATE_TIME_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second ?? 0),
    ),
  );

  return isConsistent(date, year, month, day) ? date : null;
}

/** Aceita `yyyy-MM-dd` e devolve a meia-noite daquele dia. */
export function parseLocalDate(value: string): Date | null {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return isConsistent(date, year, month, day) ? date : null;
}

/** Rejeita datas que o `Date.UTC` normalizou silenciosamente, como 2026-02-31. */
function isConsistent(date: Date, year: string, month: string, day: string): boolean {
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

export function requireLocalDateTime(value: string, field: string): Date {
  const parsed = parseLocalDateTime(value);
  if (!parsed) {
    throw new BadParametersError(`O formato de '${field}' deve ser [yyyy-MM-ddTHH:mm:ss].`);
  }
  return parsed;
}

/**
 * Fuso de operação do sistema. O backend Java usa `America/Sao_Paulo` no Jackson e
 * `America/Maceio` no cálculo de ocupação de sala; ambos são UTC-3 sem horário de verão,
 * então um único fuso reproduz os dois comportamentos.
 */
export const APP_TIME_ZONE = 'America/Sao_Paulo';

const wallClockFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/**
 * Instante atual convertido para o horário de parede do fuso da aplicação e devolvido
 * como `Date` em UTC — a mesma convenção usada na importação do dump.
 *
 * Usar `new Date()` cru aqui seria um bug: às 09:00 em São Paulo o instante UTC é 12:00,
 * e a comparação contra os horários das reservas (que são horário de parede) apontaria
 * a sala errada como ocupada.
 */
export function nowWallClock(): Date {
  const parts = wallClockFormatter.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return new Date(
    Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')),
  );
}

/** Zera a hora mantendo o dia em UTC, equivalente a `LocalDateTime.toLocalDate()`. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Dia da semana no padrão ISO usado pelo Java (1 = segunda, 7 = domingo).
 * O `getUTCDay()` do JavaScript usa 0 = domingo.
 */
export function isoWeekday(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

/** Avança para o próximo dia da semana ISO, mantendo a data se já for esse dia. */
export function nextOrSameWeekday(date: Date, isoDay: number): Date {
  const offset = (isoDay - isoWeekday(date) + 7) % 7;
  return addDays(date, offset);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/** Combina a data de um `Date` com a hora de outro, ambos em UTC. */
export function combineDateAndTime(date: Date, time: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      time.getUTCHours(),
      time.getUTCMinutes(),
      time.getUTCSeconds(),
      time.getUTCMilliseconds(),
    ),
  );
}
