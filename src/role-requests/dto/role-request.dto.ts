import { z } from 'zod';
import { ASSIGNABLE_ROLES, ROLE_ASSISTANT, ROLE_COORDINATOR } from '../../auth/roles';
import { ROLE_REQUEST_STATUSES, RoleRequestStatus } from '../../database/documents';

export const JUSTIFICATION_MIN_LENGTH = 10;
export const JUSTIFICATION_MAX_LENGTH = 500;
export const REVIEW_NOTE_MAX_LENGTH = 500;

/** Só perfis que podem estar acima de alguém: visualizador nunca é pedido. */
export const createRoleRequestSchema = z.object({
  requestedRole: z.enum([ROLE_ASSISTANT, ROLE_COORDINATOR], {
    error: 'Escolha o perfil desejado.',
  }),
  justification: z
    .string({ error: 'Explique por que você precisa deste acesso.' })
    .trim()
    .min(
      JUSTIFICATION_MIN_LENGTH,
      `A justificativa deve ter pelo menos ${JUSTIFICATION_MIN_LENGTH} caracteres.`,
    )
    .max(
      JUSTIFICATION_MAX_LENGTH,
      `A justificativa deve ter no máximo ${JUSTIFICATION_MAX_LENGTH} caracteres.`,
    ),
});

export type CreateRoleRequestDto = z.infer<typeof createRoleRequestSchema>;

export const rejectRoleRequestSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(REVIEW_NOTE_MAX_LENGTH, `O motivo deve ter no máximo ${REVIEW_NOTE_MAX_LENGTH} caracteres.`)
      .nullish(),
  })
  .nullish()
  .transform((value) => ({ reason: value?.reason || null }));

export type RejectRoleRequestDto = z.infer<typeof rejectRoleRequestSchema>;

export const changeUserRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES, { error: 'Escolha um perfil válido.' }),
});

export type ChangeUserRoleDto = z.infer<typeof changeUserRoleSchema>;

/** Filtro opcional da listagem; valor desconhecido é ignorado, como os demais filtros. */
export const roleRequestStatusFilterSchema = z
  .enum(ROLE_REQUEST_STATUSES)
  .optional()
  .catch(undefined);

export interface RoleRequestResponse {
  id: number;
  userId: number;
  userName: string;
  userEmail: string | null;
  currentRole: string;
  requestedRole: string;
  justification: string;
  status: RoleRequestStatus;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string | null;
}

export interface RoleRequestSummaryResponse {
  pending: number;
}
