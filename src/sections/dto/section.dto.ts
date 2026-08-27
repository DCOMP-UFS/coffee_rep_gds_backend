import { z } from 'zod';

/**
 * Atenção à assimetria já existente no contrato: a escrita usa `observacao` (singular) e
 * a leitura devolve `observacoes` (plural). O frontend depende dos dois nomes.
 */
export const createSectionSchema = z.object({
  nome: z
    .string({ error: 'O nome do setor deve ser preenchido!' })
    .trim()
    .min(1, 'O nome do setor não deve ser deixado em branco!'),
  observacao: z.string().nullish(),
});

export type CreateSectionDto = z.infer<typeof createSectionSchema>;

/**
 * O `PUT /api/section/{id}` do Java **não** tem `@Valid`, então as constraints não são
 * aplicadas na atualização. O schema permissivo abaixo preserva esse comportamento.
 */
export const updateSectionSchema = z.object({
  nome: z.string().nullish(),
  observacao: z.string().nullish(),
});

export type UpdateSectionDto = z.infer<typeof updateSectionSchema>;

/** Resposta das listagens. */
export interface SectionResponse {
  id: number;
  nome: string;
  observacoes: string | null;
}

/** Resposta de criação e atualização. */
export interface CreateSectionResponse {
  id: number;
  nome: string;
  observacao: string | null;
}
