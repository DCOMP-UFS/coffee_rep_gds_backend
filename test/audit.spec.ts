import { Logger } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditModule } from '../src/audit/audit.module';
import { AuditRepository } from '../src/audit/audit.repository';
import { AuditService } from '../src/audit/audit.service';
import { COLLECTIONS } from '../src/database/documents';
import { RequestersModule } from '../src/requesters/requesters.module';
import { ReservationsModule } from '../src/reservations/reservations.module';
import { RoomsModule } from '../src/rooms/rooms.module';
import { SectionsModule } from '../src/sections/sections.module';
import { UsersRepository } from '../src/users/users.repository';
import { authed, basicToken, seedCatalog, seedUsers } from './support/fixtures';
import { TestApp, createTestApp } from './support/test-app';

describe('Auditoria', () => {
  let context: TestApp;
  let client: ReturnType<typeof authed>;

  beforeAll(async () => {
    context = await createTestApp([
      AuditModule,
      SectionsModule,
      RoomsModule,
      RequestersModule,
      ReservationsModule,
    ]);
    await seedUsers(context.db);
    client = authed(context.app, await basicToken(context.app));
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    for (const name of [
      COLLECTIONS.sections,
      COLLECTIONS.rooms,
      COLLECTIONS.requesters,
      COLLECTIONS.reservations,
      COLLECTIONS.requesterAbsences,
      COLLECTIONS.auditEvents,
      COLLECTIONS.counters,
    ]) {
      await context.db.collection(name).deleteMany({});
    }
    await seedCatalog(context.db);
    await context.db
      .collection(COLLECTIONS.counters)
      .insertOne({ _id: COLLECTIONS.users, seq: 5 } as never);
  });

  it('GET /api/audit devolve envelope paginado', async () => {
    const response = await client.get('/api/audit?page=0&size=10').expect(200);

    expect(response.body.page).toEqual({
      size: 10,
      number: 0,
      totalElements: 0,
      totalPages: 0,
    });
    expect(response.body.content).toEqual([]);
  });

  it('criar sala gera evento listável em GET /api/audit', async () => {
    await client
      .post('/api/room')
      .send({ nome: 'Sala Auditoria', setorId: 4 })
      .expect(201);

    const response = await client.get('/api/audit?page=0&size=10').expect(200);

    expect(response.body.page.totalElements).toBe(1);
    expect(response.body.content[0]).toMatchObject({
      action: 'room.create',
      entityType: 'room',
      actorUserId: 5,
      actorName: 'Brenda HU',
      details: expect.objectContaining({ nome: 'Sala Auditoria' }),
    });
    expect(response.body.content[0].entityId).toEqual(expect.any(Number));
    expect(response.body.content[0].createdAt).toEqual(expect.any(String));
  });

  it('cancelar reserva registra ator no evento', async () => {
    const created = await client
      .post('/api/reservation')
      .send({
        salaId: 12,
        solicitanteId: 3,
        horaInicio: '2026-09-10T10:00:00',
        horaFim: '2026-09-10T11:00:00',
        formo: false,
      })
      .expect(201);

    await client.patch(`/api/reservation/${created.body.id}`).expect(204);

    const response = await client
      .get('/api/audit?action=reservation.cancel&page=0&size=10')
      .expect(200);

    expect(response.body.content).toHaveLength(1);
    expect(response.body.content[0]).toMatchObject({
      action: 'reservation.cancel',
      entityType: 'reservation',
      entityId: created.body.id,
      actorUserId: 5,
      actorName: 'Brenda HU',
    });
  });

  it('filtra por q no nome do ator', async () => {
    await client
      .post('/api/room')
      .send({ nome: 'Sala Busca', setorId: 4 })
      .expect(201);

    const hit = await client.get('/api/audit?q=Brenda&page=0&size=10').expect(200);
    expect(hit.body.page.totalElements).toBeGreaterThanOrEqual(1);

    const miss = await client.get('/api/audit?q=Ninguem&page=0&size=10').expect(200);
    expect(miss.body.page.totalElements).toBe(0);
  });
});

describe('AuditService.record', () => {
  it('engole falha de persistência sem lançar', async () => {
    const repository = {
      insert: vi.fn().mockRejectedValue(new Error('mongo down')),
    };
    const users = {
      findById: vi.fn().mockResolvedValue({ _id: 5, name: 'Alice' }),
    };

    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const service = new AuditService(
      repository as unknown as AuditRepository,
      users as unknown as UsersRepository,
    );

    await expect(
      service.record({
        action: 'room.create',
        entityType: 'room',
        entityId: 1,
        actorUserId: 5,
        details: { nome: 'X' },
      }),
    ).resolves.toBeUndefined();

    expect(repository.insert).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
