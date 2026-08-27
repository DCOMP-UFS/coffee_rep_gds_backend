import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export type PgRow = Record<string, string | null>;

const COPY_HEADER = /^COPY public\.(\w+) \(([^)]+)\) FROM stdin;$/;

/**
 * Postgres escapa apenas estes caracteres no formato texto do COPY.
 * `\N` isolado representa NULL e é tratado antes de chegar aqui.
 */
function unescapeCopyValue(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== '\\') {
      out += raw[i];
      continue;
    }
    const next = raw[++i];
    switch (next) {
      case 'n':
        out += '\n';
        break;
      case 't':
        out += '\t';
        break;
      case 'r':
        out += '\r';
        break;
      case 'b':
        out += '\b';
        break;
      case 'f':
        out += '\f';
        break;
      case 'v':
        out += '\v';
        break;
      case '\\':
        out += '\\';
        break;
      default:
        out += next ?? '';
    }
  }
  return out;
}

/** Lê um dump `pg_dump` (formato plain) e devolve as linhas de cada bloco COPY por tabela. */
export async function parsePgDump(path: string): Promise<Map<string, PgRow[]>> {
  const tables = new Map<string, PgRow[]>();
  const reader = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let currentTable: string | null = null;
  let currentColumns: string[] = [];

  for await (const line of reader) {
    if (currentTable === null) {
      const match = COPY_HEADER.exec(line);
      if (match) {
        currentTable = match[1];
        currentColumns = match[2].split(',').map((c) => c.trim());
        tables.set(currentTable, []);
      }
      continue;
    }

    if (line === '\\.') {
      currentTable = null;
      currentColumns = [];
      continue;
    }

    const values = line.split('\t');
    const row: PgRow = {};
    currentColumns.forEach((column, index) => {
      const raw = values[index];
      row[column] = raw === undefined || raw === '\\N' ? null : unescapeCopyValue(raw);
    });
    tables.get(currentTable)!.push(row);
  }

  return tables;
}

export function toInt(value: string | null): number | null {
  return value === null ? null : Number.parseInt(value, 10);
}

/**
 * Os timestamps do dump são `timestamp without time zone`, ou seja, horário de parede
 * sem fuso. Interpretamos como UTC para que o valor exibido continue idêntico ao do
 * Postgres — reservas às 07:00 seguem às 07:00, sem deslocamento por fuso.
 */
export function toDate(value: string | null): Date | null {
  if (value === null) return null;
  const normalized = value.replace(' ', 'T');
  const iso = /(Z|[+-]\d{2}(:?\d{2})?)$/.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
