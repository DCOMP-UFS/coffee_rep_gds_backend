import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuditModule } from '../src/audit/audit.module';
import { PERMISSION_DENIED_MESSAGE } from '../src/auth/permissions';
import { COLLECTIONS } from '../src/database/documents';
import { RequesterAbsencesModule } from '../src/requester-absences/requester-absences.module';
import { RequestersModule } from '../src/requesters/requesters.module';
import { RECURRING_RESERVATION_DENIED_MESSAGE } from '../src/reservations/reservation-permissions';
import { ReservationsModule } from '../src/reservations/reservations.module';
import { RoleRequestsModule } from '../src/role-requests/role-requests.module';
import { RoomsModule } from '../src/rooms/rooms.module';
import { SectionsModule } from '../src/sections/sections.module';
import { UsersModule } from '../src/users/users.module';
import {
  VIEWER_USER,
  adminToken,
  assistantToken,
  authed,
  basicToken,
  coordinatorToken,
  seedCatalog,
  seedUsers,
  viewerToken,
} from './support/fixtures';
import { TestApp, createTestApp } from './support/test-app';

const PERIOD = 'inicio=2026-08-01T00:00:00&fim=2026-09-30T23:59:59';

const single = {
  salaId: 12,
  solicitanteId: 2,
  horaInicio: '2026-08-24T08:00',
  horaFim: '2026-08-24T10:00',
};

const recurrent = {
  salaId: 13,
  solicitanteId: 2,
  horaInicio: '2026-08-24T08:00',
  horaFim: '2026-09-07T10:00',
  fixo: true,
  dias: [1],
};

type Client = ReturnType<typeof authed>;

describe('Permissões por perfil', () => {
  let context: TestApp;
  const clients = {} as Record<'viewer' | 'assistant' | 'coordinator' | 'admin' | 'basic', Client>;

  beforeAll(async () => {
    context = await createTestApp([
      UsersModule,
      AuditModule,
      SectionsModule,
      RoomsModule,
      RequestersModule,
      RequesterAbsencesModule,
      ReservationsModule,
      RoleRequestsModule,
    ]);
    await seedUsers(context.db);
    clients.viewer = authed(context.app, await viewerToken(context.app));
    clients.assistant = authed(context.app, await assistantToken(context.app));
    clients.coordinator = authed(context.app, await coordinatorToken(context.app));
    clients.admin = authed(context.app, await adminToken(context.app));
    clients.basic = authed(context.app, await basicToken(context.app));
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    for (const name of [
      COLLECTIONS.sections,
      COLLECTIONS.rooms,
      COLLECTIONS.requesters,
      COLLECTIONS.requesterAbsences,
      COLLECTIONS.reservations,
      COLLECTIONS.counters,
    ]) {
      await context.db.collection(name).deleteMany({});
    }
    await seedCatalog(context.db);
  });

  /** Cria uma série recorrente como coordenação e devolve o id e uma ocorrência. */
  async function createSeries(): Promise<{ recurrenceId: number; occurrenceId: number }> {
    const created = await clients.coordinator.post('/api/reservation').send(recurrent).expect(201);
    const recurrenceId = created.body.recurrenceId as number;
    const occurrence = await context.db
      .collection(COLLECTIONS.reservations)
      .findOne({ recurrenceId });
    return { recurrenceId, occurrenceId: occurrence!._id as unknown as number };
  }

  describe('visualizador', () => {
    it('consulta salas, reservas, setores, solicitantes, ausências e o histórico', async () => {
      await clients.viewer.get('/api/room').expect(200);
      await clients.viewer.get(`/api/reservation?${PERIOD}`).expect(200);
      await clients.viewer.get('/api/section').expect(200);
      await clients.viewer.get('/api/requester').expect(200);
      await clients.viewer.get('/api/requester-absence').expect(200);
      await clients.viewer.get('/api/audit').expect(200);
    });

    it.each([
      ['POST /api/section', (c: Client) => c.post('/api/section').send({ nome: 'Nova' })],
      ['POST /api/room', (c: Client) => c.post('/api/room').send({ nome: 'Sala X', setorId: 4 })],
      ['PUT /api/room/12', (c: Client) => c.put('/api/room/12').send({ nome: 'Sala Y', setorId: 4 })],
      ['DELETE /api/room/12', (c: Client) => c.delete('/api/room/12')],
      [
        'POST /api/requester',
        (c: Client) => c.post('/api/requester').send({ nome: 'Dr. X', especialidade: 'Clínica' }),
      ],
      [
        'POST /api/requester-absence',
        (c: Client) =>
          c
            .post('/api/requester-absence')
            .send({ solicitanteId: 2, dataInicio: '2026-08-24', dataFim: '2026-08-25' }),
      ],
      ['POST /api/reservation', (c: Client) => c.post('/api/reservation').send(single)],
      ['GET /api/user', (c: Client) => c.get('/api/user')],
      ['GET /api/role-request', (c: Client) => c.get('/api/role-request')],
    ])('recebe 403 em %s', async (_name, call) => {
      const response = await call(clients.viewer).expect(403);
      expect(response.body.status).toBe(403);
    });

    it('explica em português o motivo do 403', async () => {
      const response = await clients.viewer.post('/api/section').send({ nome: 'Nova' }).expect(403);
      expect(response.body.message).toBe(PERMISSION_DENIED_MESSAGE);
    });
  });

  describe('assistente administrativo', () => {
    it('cria e cancela reserva pontual de qualquer pessoa', async () => {
      const created = await clients.coordinator.post('/api/reservation').send(single).expect(201);
      await clients.assistant.patch(`/api/reservation/${created.body.id}`).expect(204);

      await clients.assistant.post('/api/reservation').send(single).expect(201);
    });

    it('não cria reserva recorrente', async () => {
      const response = await clients.assistant
        .post('/api/reservation')
        .send(recurrent)
        .expect(403);
      expect(response.body.message).toBe(RECURRING_RESERVATION_DENIED_MESSAGE);
      expect(await context.db.collection(COLLECTIONS.reservations).countDocuments()).toBe(0);
    });

    it('não cancela ocorrência de série nem a série inteira', async () => {
      const { recurrenceId, occurrenceId } = await createSeries();

      await clients.assistant.patch(`/api/reservation/${occurrenceId}`).expect(403);
      await clients.assistant.delete(`/api/reservation/recurrent/${recurrenceId}`).expect(403);
    });

    it('gerencia ausências', async () => {
      const created = await clients.assistant
        .post('/api/requester-absence')
        .send({ solicitanteId: 2, dataInicio: '2026-08-24', dataFim: '2026-08-25' })
        .expect(201);
      await clients.assistant.delete(`/api/requester-absence/${created.body.id}`).expect(204);
    });

    it('não altera o cadastro', async () => {
      await clients.assistant.post('/api/section').send({ nome: 'Nova' }).expect(403);
      await clients.assistant.post('/api/room').send({ nome: 'Sala X', setorId: 4 }).expect(403);
    });

    it('consulta o histórico', async () => {
      await clients.assistant.get('/api/audit').expect(200);
    });
  });

  describe('coordenação', () => {
    it('gerencia o cadastro', async () => {
      await clients.coordinator.post('/api/section').send({ nome: 'Nova' }).expect(201);
      await clients.coordinator.post('/api/room').send({ nome: 'Sala X', setorId: 4 }).expect(201);
      await clients.coordinator
        .post('/api/requester')
        .send({ nome: 'Dr. X', especialidade: 'Clínica' })
        .expect(201);
    });

    it('cria e cancela reservas recorrentes, inclusive uma ocorrência', async () => {
      const { recurrenceId, occurrenceId } = await createSeries();

      await clients.coordinator.patch(`/api/reservation/${occurrenceId}`).expect(204);
      await clients.coordinator.delete(`/api/reservation/recurrent/${recurrenceId}`).expect(204);
    });

    it('não gerencia usuários nem analisa pedidos', async () => {
      await clients.coordinator.get('/api/user').expect(403);
      await clients.coordinator
        .patch(`/api/user/${VIEWER_USER.id}/role`)
        .send({ role: 'ASSISTANT' })
        .expect(403);
      await clients.coordinator.get('/api/role-request').expect(403);
      await clients.coordinator.get('/api/role-request/summary').expect(403);
    });
  });

  describe('BASIC legado (antes da migração)', () => {
    it('mantém o acesso de coordenação', async () => {
      await clients.basic.post('/api/section').send({ nome: 'Nova' }).expect(201);
      await clients.basic.post('/api/reservation').send(recurrent).expect(201);
      await clients.basic.get('/api/user').expect(403);
    });
  });

  describe('administrador do sistema', () => {
    it('faz tudo o que a coordenação faz e ainda gerencia usuários e pedidos', async () => {
      await clients.admin.post('/api/section').send({ nome: 'Nova' }).expect(201);
      await clients.admin.post('/api/reservation').send(recurrent).expect(201);
      await clients.admin.get('/api/user').expect(200);
      await clients.admin.get('/api/role-request').expect(200);
      await clients.admin.get('/api/role-request/summary').expect(200);
    });
  });
});
