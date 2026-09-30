export const AUDIT_ACTIONS = [
  'section.create',
  'section.update',
  'section.delete',
  'room.create',
  'room.update',
  'room.delete',
  'requester.create',
  'requester.update',
  'requester.delete',
  'absence.create',
  'absence.update',
  'absence.delete',
  'reservation.create',
  'reservation.cancel',
  'reservation.cancel_recurrence',
  'auth.register',
  'auth.login',
  'user.role_change',
  'role_request.create',
  'role_request.approve',
  'role_request.reject',
  'role_request.cancel',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  'section',
  'room',
  'requester',
  'absence',
  'reservation',
  'user',
  'role_request',
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const UNKNOWN_ACTOR_NAME = 'Desconhecido';

export interface RecordAuditInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: number | null;
  actorUserId: number | null;
  details?: Record<string, unknown>;
  /** Permite backfill preservar a data original do documento. */
  createdAt?: Date;
  /** Quando true, não resolve o nome do usuário (já vem em actorName). */
  actorName?: string;
}
