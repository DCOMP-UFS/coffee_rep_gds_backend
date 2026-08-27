import { hash } from 'bcryptjs';
import { Db } from 'mongodb';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokenService } from '../../src/auth/token.service';
import {
  COLLECTIONS,
  RESERVATION_APPROVED,
  ROLE_ADMIN,
  ROLE_BASIC,
  STATUS_ACTIVE,
} from '../../src/database/documents';

export const ADMIN_CPF = '17145992990';
export const BASIC_CPF = '78095815543';
export const DEFAULT_PASSWORD = 'senha123';

/** Data base das fixtures, alinhada com o horário de parede usado no banco. */
export function at(iso: string): Date {
  return new Date(`${iso}Z`);
}

export async function seedUsers(db: Db): Promise<void> {
  const password = await hash(DEFAULT_PASSWORD, 4);

  await db.collection(COLLECTIONS.users).insertMany([
    {
      _id: 1,
      name: 'Admin',
      email: 'admin@admin.com',
      cpf: ADMIN_CPF,
      password,
      phone: '79999999999',
      birthDate: at('1995-01-01T00:00:00'),
      status: STATUS_ACTIVE,
      roles: [ROLE_ADMIN],
      createdAt: at('2026-05-10T22:45:29'),
      updatedAt: null,
      updatedBy: null,
    },
    {
      _id: 5,
      name: 'Brenda HU',
      email: 'brenda@teste.com',
      cpf: BASIC_CPF,
      password,
      phone: '88888888888',
      birthDate: at('2000-01-01T00:00:00'),
      status: STATUS_ACTIVE,
      roles: [ROLE_BASIC],
      createdAt: at('2026-05-12T16:28:21'),
      updatedAt: null,
      updatedBy: null,
    },
  ] as never);

  await db
    .collection(COLLECTIONS.counters)
    .insertOne({ _id: COLLECTIONS.users, seq: 5 } as never);
}

export async function tokenFor(
  app: INestApplication,
  userId: number,
  roles: string[],
): Promise<string> {
  const { token } = await app.get(TokenService).sign(userId, roles);
  return token;
}

export function adminToken(app: INestApplication): Promise<string> {
  return tokenFor(app, 1, [ROLE_ADMIN]);
}

export function basicToken(app: INestApplication): Promise<string> {
  return tokenFor(app, 5, [ROLE_BASIC]);
}

/** Cliente autenticado, para não repetir o header em cada teste. */
export function authed(app: INestApplication, token: string) {
  const agent = request(app.getHttpServer());
  return {
    get: (url: string) => agent.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => agent.post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => agent.put(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => agent.patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => agent.delete(url).set('Authorization', `Bearer ${token}`),
  };
}

export async function seedCatalog(db: Db): Promise<void> {
  await db.collection(COLLECTIONS.sections).insertMany([
    {
      _id: 4,
      name: 'Pediatria',
      observations: 'Ala infantil',
      status: STATUS_ACTIVE,
      createdAt: at('2026-05-12T17:28:47'),
      updatedAt: null,
      updatedBy: 5,
    },
    {
      _id: 8,
      name: 'Oftalmologia',
      observations: null,
      status: STATUS_ACTIVE,
      createdAt: at('2026-05-12T17:28:48'),
      updatedAt: null,
      updatedBy: 5,
    },
  ] as never);

  await db.collection(COLLECTIONS.rooms).insertMany([
    {
      _id: 12,
      name: 'Pediatria - Sala 01',
      status: STATUS_ACTIVE,
      sectionId: 4,
      createdAt: at('2026-05-12T17:28:47'),
      updatedAt: null,
      updatedBy: 5,
    },
    {
      _id: 13,
      name: 'Pediatria - Sala 02',
      status: STATUS_ACTIVE,
      sectionId: 4,
      createdAt: at('2026-05-12T17:28:48'),
      updatedAt: null,
      updatedBy: 5,
    },
    {
      _id: 36,
      name: 'Oftalmologia - Sala 05',
      status: STATUS_ACTIVE,
      sectionId: 8,
      createdAt: at('2026-05-12T17:28:49'),
      updatedAt: null,
      updatedBy: 5,
    },
  ] as never);

  await db.collection(COLLECTIONS.requesters).insertMany([
    {
      _id: 2,
      name: 'Dra. Ana Souza',
      contactNumber: '79999010001',
      specialty: 'Cardiologia',
      status: STATUS_ACTIVE,
      createdAt: at('2026-05-12T17:28:47'),
      updatedAt: null,
      updatedBy: 5,
    },
    {
      _id: 3,
      name: 'Dr. Bruno Lima',
      contactNumber: '79999010002',
      specialty: 'Neurologia',
      status: STATUS_ACTIVE,
      createdAt: at('2026-05-12T17:28:48'),
      updatedAt: null,
      updatedBy: 5,
    },
  ] as never);

  await db.collection(COLLECTIONS.counters).insertMany([
    { _id: COLLECTIONS.sections, seq: 21 },
    { _id: COLLECTIONS.rooms, seq: 122 },
    { _id: COLLECTIONS.requesters, seq: 274 },
    { _id: COLLECTIONS.requesterAbsences, seq: 2 },
    { _id: COLLECTIONS.reservations, seq: 7713 },
  ] as never);
}

export { RESERVATION_APPROVED };
