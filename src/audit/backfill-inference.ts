import {
  RESERVATION_CANCELLED,
  STATUS_INACTIVE,
  type AuditEventDocument,
} from '../database/documents';
import type { AuditAction, AuditEntityType } from './audit.types';
import { UNKNOWN_ACTOR_NAME } from './audit.types';

export interface BackfillSourceDoc {
  _id: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  updatedBy: number | null;
  status?: number;
  name?: string | null;
  email?: string | null;
  sectionId?: number;
  requesterId?: number;
  roomId?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface InferredAuditEvent {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: number;
  actorUserId: number | null;
  actorName: string;
  createdAt: Date;
  details: Record<string, unknown>;
}

export interface ActorLookup {
  (userId: number): string | null | undefined;
}

function actorFields(
  userId: number | null | undefined,
  resolveName: ActorLookup,
  trusted: boolean,
): Pick<InferredAuditEvent, 'actorUserId' | 'actorName'> & {
  detailsExtra: Record<string, unknown>;
} {
  if (!trusted || userId == null) {
    return {
      actorUserId: null,
      actorName: UNKNOWN_ACTOR_NAME,
      detailsExtra: { actorInferred: false },
    };
  }
  return {
    actorUserId: userId,
    actorName: resolveName(userId)?.trim() || UNKNOWN_ACTOR_NAME,
    detailsExtra: { actorInferred: true },
  };
}

function baseDetails(
  source: string,
  sourceId: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    backfill: true,
    backfillSource: source,
    backfillSourceId: sourceId,
    ...extra,
  };
}

/**
 * Infere no máximo 1–2 eventos sintéticos a partir de um documento de cadastro
 * (section/room/requester) com soft delete.
 */
export function inferCadastroEvents(
  source: 'sections' | 'rooms' | 'requesters',
  entityType: 'section' | 'room' | 'requester',
  doc: BackfillSourceDoc,
  resolveName: ActorLookup,
): InferredAuditEvent[] {
  const events: InferredAuditEvent[] = [];
  if (!doc.createdAt) {
    return events;
  }

  const neverUpdated = doc.updatedAt == null;
  const createActor = actorFields(doc.updatedBy, resolveName, neverUpdated);
  const entityDetails: Record<string, unknown> = {};
  if (doc.name) entityDetails.nome = doc.name;
  if (doc.sectionId != null) entityDetails.setorId = doc.sectionId;

  events.push({
    action: `${entityType}.create` as AuditAction,
    entityType,
    entityId: doc._id,
    actorUserId: createActor.actorUserId,
    actorName: createActor.actorName,
    createdAt: doc.createdAt,
    details: baseDetails(source, doc._id, { ...entityDetails, ...createActor.detailsExtra }),
  });

  const isInactive = doc.status === STATUS_INACTIVE;
  if (doc.updatedAt) {
    const updateActor = actorFields(doc.updatedBy, resolveName, true);
    const action = (isInactive ? `${entityType}.delete` : `${entityType}.update`) as AuditAction;
    events.push({
      action,
      entityType,
      entityId: doc._id,
      actorUserId: updateActor.actorUserId,
      actorName: updateActor.actorName,
      createdAt: doc.updatedAt,
      details: baseDetails(source, doc._id, { ...entityDetails, ...updateActor.detailsExtra }),
    });
  }

  return events;
}

/** Ausências: hard delete no runtime; no backfill só create (+ update se updatedAt). */
export function inferAbsenceEvents(
  doc: BackfillSourceDoc,
  resolveName: ActorLookup,
): InferredAuditEvent[] {
  const events: InferredAuditEvent[] = [];
  if (!doc.createdAt) return events;

  const neverUpdated = doc.updatedAt == null;
  const createActor = actorFields(doc.updatedBy, resolveName, neverUpdated);
  const entityDetails: Record<string, unknown> = {
    solicitanteId: doc.requesterId,
  };

  events.push({
    action: 'absence.create',
    entityType: 'absence',
    entityId: doc._id,
    actorUserId: createActor.actorUserId,
    actorName: createActor.actorName,
    createdAt: doc.createdAt,
    details: baseDetails('requesterAbsences', doc._id, {
      ...entityDetails,
      ...createActor.detailsExtra,
    }),
  });

  if (doc.updatedAt) {
    const updateActor = actorFields(doc.updatedBy, resolveName, true);
    events.push({
      action: 'absence.update',
      entityType: 'absence',
      entityId: doc._id,
      actorUserId: updateActor.actorUserId,
      actorName: updateActor.actorName,
      createdAt: doc.updatedAt,
      details: baseDetails('requesterAbsences', doc._id, {
        ...entityDetails,
        ...updateActor.detailsExtra,
      }),
    });
  }

  return events;
}

/**
 * Reservas: sempre create. Não inventa cancel (cancel não deixa updatedAt/updatedBy).
 * Em reservas, `updatedBy` é o criador.
 */
export function inferReservationEvents(
  doc: BackfillSourceDoc,
  resolveName: ActorLookup,
): InferredAuditEvent[] {
  if (!doc.createdAt) return [];

  const createActor = actorFields(doc.updatedBy, resolveName, true);
  return [
    {
      action: 'reservation.create',
      entityType: 'reservation',
      entityId: doc._id,
      actorUserId: createActor.actorUserId,
      actorName: createActor.actorName,
      createdAt: doc.createdAt,
      details: baseDetails('reservations', doc._id, {
        salaId: doc.roomId,
        solicitanteId: doc.requesterId,
        cancelada: doc.status === RESERVATION_CANCELLED,
        ...createActor.detailsExtra,
      }),
    },
  ];
}

/** Cadastro de usuário → auth.register; ator = o próprio usuário. */
export function inferUserRegisterEvent(
  doc: BackfillSourceDoc,
): InferredAuditEvent | null {
  if (!doc.createdAt) return null;

  const name = doc.name?.trim() || UNKNOWN_ACTOR_NAME;
  return {
    action: 'auth.register',
    entityType: 'user',
    entityId: doc._id,
    actorUserId: doc._id,
    actorName: name,
    createdAt: doc.createdAt,
    details: baseDetails('users', doc._id, {
      email: doc.email,
      actorInferred: true,
    }),
  };
}

/** Chave de idempotência usada pelo script e pelos testes. */
export function backfillKey(event: Pick<InferredAuditEvent, 'action' | 'details'>): string {
  return `${event.details.backfillSource}:${event.details.backfillSourceId}:${event.action}`;
}

export type InsertedLike = Pick<
  AuditEventDocument,
  'action' | 'details'
>;

export function alreadyBackfilled(
  existing: InsertedLike[],
  event: InferredAuditEvent,
): boolean {
  const key = backfillKey(event);
  return existing.some(
    (item) =>
      item.details?.backfillSource === event.details.backfillSource &&
      item.details?.backfillSourceId === event.details.backfillSourceId &&
      item.action === event.action &&
      key === backfillKey({ action: item.action as AuditAction, details: item.details }),
  );
}
