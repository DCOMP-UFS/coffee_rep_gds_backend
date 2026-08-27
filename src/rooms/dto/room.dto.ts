import { z } from 'zod';

export const createRoomSchema = z.object({
  nome: z
    .string({ error: 'O nome da sala deve ser preenchida!' })
    .trim()
    .min(1, 'O nome da sala não deve ser deixada em branco!'),
  setorId: z.coerce.number({ error: 'O ID do setor deve ser preenchido!' }).int(),
});

export type CreateRoomDto = z.infer<typeof createRoomSchema>;

/**
 * O `PUT /api/room/{id}` do Java não tem `@Valid`. Mantemos o schema permissivo, mas
 * `setorId` ausente passa a significar "manter o setor atual" em vez de estourar um
 * NullPointerException. Ver docs/BUGS-HERDADOS.md.
 */
export const updateRoomSchema = z.object({
  nome: z.string().nullish(),
  setorId: z.coerce.number().int().nullish(),
});

export type UpdateRoomDto = z.infer<typeof updateRoomSchema>;

export interface RoomResponse {
  id: number;
  nome: string;
  setor: string;
  setorId: number;
  ocupada: boolean;
}

/** A resposta de criação/atualização não traz `setorId` nem `ocupada`. */
export interface CreateRoomResponse {
  id: number;
  nome: string;
  setor: string;
}

/** `ocupada` é ternário na query string: ausente traz todas. */
export const occupiedSchema = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    return value === true || value === 'true';
  });
