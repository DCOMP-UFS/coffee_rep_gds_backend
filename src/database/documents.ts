/**
 * Tipos dos documentos gravados pela migração em `scripts/migrate-dump.ts`.
 *
 * Os ids numéricos do Postgres foram preservados como `_id` para manter o contrato da
 * API — o frontend trabalha com ids numéricos — e a coleção `counters` faz o papel das
 * sequences.
 */

/** Cadastros: 1 = ativo, 0 = inativo (`Status` do Java). */
export const STATUS_ACTIVE = 1;
export const STATUS_INACTIVE = 0;

/** Reservas: 1 = aprovada, 2 = cancelada (`ReservationStatus` do Java). Não existe 0. */
export const RESERVATION_APPROVED = 1;
export const RESERVATION_CANCELLED = 2;

export const ROLE_ADMIN = 'ADMIN';
export const ROLE_BASIC = 'BASIC';

/** Campos de auditoria comuns a todos os agregados. */
interface Auditable {
  createdAt: Date | null;
  updatedAt: Date | null;
  /** Id do usuário; em reservas guarda o criador, como no Java. */
  updatedBy: number | null;
}

export interface UserDocument extends Auditable {
  _id: number;
  name: string | null;
  email: string | null;
  cpf: string | null;
  password: string | null;
  phone: string | null;
  birthDate: Date | null;
  status: number;
  roles: string[];
}

export interface SectionDocument extends Auditable {
  _id: number;
  name: string;
  observations: string | null;
  status: number;
}

export interface RoomDocument extends Auditable {
  _id: number;
  name: string;
  status: number;
  sectionId: number;
}

export interface RequesterDocument extends Auditable {
  _id: number;
  name: string;
  contactNumber: string | null;
  specialty: string | null;
  status: number;
}

export interface RequesterAbsenceDocument extends Auditable {
  _id: number;
  requesterId: number;
  startDate: Date;
  endDate: Date;
}

export interface ReservationDocument extends Auditable {
  _id: number;
  startDate: Date;
  endDate: Date;
  observations: string | null;
  roomId: number;
  requesterId: number;
  status: number;
  recurrenceId: number | null;
}

export interface CounterDocument {
  _id: string;
  seq: number;
}

export const COLLECTIONS = {
  users: 'users',
  sections: 'sections',
  rooms: 'rooms',
  requesters: 'requesters',
  requesterAbsences: 'requesterAbsences',
  reservations: 'reservations',
  counters: 'counters',
} as const;

/** Chave usada no `counters` para numerar as séries de reservas recorrentes. */
export const RECURRENCE_COUNTER = 'recurrences';
