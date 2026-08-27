import { z } from 'zod';

export const createRequesterSchema = z.object({
  nome: z
    .string({ error: 'O nome do solicitante deve ser preenchido!' })
    .trim()
    .min(1, 'O nome do solicitante não deve ser deixado em branco!'),
  telefone: z.string().nullish(),
  especialidade: z
    .string({ error: 'A especialiade deve ser preenchida!' })
    .trim()
    .min(1, 'A especialidade não deve ser deixada em branco!'),
});

export type CreateRequesterDto = z.infer<typeof createRequesterSchema>;

/** O `UpdateRequesterDTO` do Java não tem constraint nenhuma, apesar do `@Valid`. */
export const updateRequesterSchema = z.object({
  nome: z.string().nullish(),
  telefone: z.string().nullish(),
  especialidade: z.string().nullish(),
});

export type UpdateRequesterDto = z.infer<typeof updateRequesterSchema>;

/**
 * Atenção à assimetria do contrato: a leitura devolve `contato` e a escrita responde
 * `telefone`. Os dois nomes são usados pelo frontend em telas diferentes.
 */
export interface RequesterResponse {
  id: number;
  nome: string;
  contato: string | null;
  especialidade: string | null;
}

export interface CreateRequesterResponse {
  id: number;
  nome: string;
  telefone: string | null;
  especialidade: string | null;
}
