import { z } from 'zod';
import { parseLocalDateTime } from '../../common/date/local-date-time';

const localDateTime = (message: string) =>
  z.string({ error: message }).transform((value, ctx) => {
    const parsed = parseLocalDateTime(value);
    if (!parsed) {
      ctx.addIssue({ code: 'custom', message: 'O formato da data deve ser [yyyy-MM-ddTHH:mm:ss].' });
      return z.NEVER;
    }
    return parsed;
  });

/**
 * Numa reserva fixa, `horaInicio` e `horaFim` deixam de ser um único intervalo e passam
 * a delimitar o período da recorrência, doando também o horário de cada ocorrência.
 */
export const createReservationSchema = z.object({
  salaId: z.coerce.number({ error: 'A sala deve ser preenchida!' }).int(),
  solicitanteId: z.coerce.number({ error: 'O solicitante deve ser preenchido!' }).int(),
  horaInicio: localDateTime('A hora de início deve ser preenchida!'),
  horaFim: localDateTime('A hora de fim deve ser preenchida!'),
  observacoes: z.string().nullish(),
  fixo: z.boolean().nullish(),
  /** Dias da semana no padrão ISO: 1 = segunda, 7 = domingo. */
  dias: z.array(z.coerce.number().int().min(1).max(7)).nullish(),
});

export type CreateReservationDto = z.infer<typeof createReservationSchema>;

export interface ReservationResponse {
  /** `reservationId`, não `id`: o nome do campo difere do usado nos demais recursos. */
  reservationId: number;
  horaInicio: string | null;
  horaFim: string | null;
  sala: string;
  solicitante: string;
  setor: string;
  criador: string | null;
  salaId: number;
  solicitanteId: number;
  setorId: number;
  recorrenciaId: number | null;
  profissionalAusente: boolean;
}

/**
 * Reserva simples devolve id e horários, com `recorrenciaId` nulo; reserva fixa devolve
 * só `recorrenciaId`, com id e horários nulos. Como os nulos são omitidos da resposta, o
 * frontend recebe objetos de formatos bem diferentes nos dois casos.
 */
export interface CreateReservationResponse {
  id: number | null;
  /** A criação responde em inglês, ao contrário da listagem. Assimetria do contrato. */
  startDate: string | null;
  endDate: string | null;
  requesterName: string;
  roomName: string;
  recurrenceId: number | null;
}
