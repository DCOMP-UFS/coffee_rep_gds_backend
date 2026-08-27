import { z } from 'zod';
import { parseLocalDate } from '../../common/date/local-date-time';

/** `@JsonFormat(pattern = "yyyy-MM-dd")` sobre um `LocalDate` no Java. */
const localDate = z
  .string({ error: 'A data deve ser preenchida.' })
  .transform((value, ctx) => {
    const parsed = parseLocalDate(value);
    if (!parsed) {
      ctx.addIssue({ code: 'custom', message: 'O formato da data deve ser [yyyy-MM-dd].' });
      return z.NEVER;
    }
    return parsed;
  });

export const createRequesterAbsenceSchema = z.object({
  solicitanteId: z.coerce.number({ error: 'O solicitante deve ser informado.' }).int(),
  dataInicio: localDate,
  dataFim: localDate,
});

export type CreateRequesterAbsenceDto = z.infer<typeof createRequesterAbsenceSchema>;

export interface RequesterAbsenceResponse {
  id: number;
  solicitanteId: number;
  solicitanteNome: string;
  dataInicio: string | null;
  dataFim: string | null;
}
