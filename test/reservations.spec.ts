import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { nowWallClock } from '../src/common/date/local-date-time';
import { COLLECTIONS } from '../src/database/documents';
import { ReservationsModule } from '../src/reservations/reservations.module';
import { at, authed, basicToken, seedCatalog, seedUsers } from './support/fixtures';
import { TestApp, createTestApp } from './support/test-app';

const PERIOD = 'inicio=2026-08-01T00:00:00&fim=2026-09-30T23:59:59';

describe('Reservas', () => {
  let context: TestApp;
  let client: ReturnType<typeof authed>;

  beforeAll(async () => {
    context = await createTestApp([ReservationsModule]);
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
      COLLECTIONS.requesterAbsences,
      COLLECTIONS.reservations,
      COLLECTIONS.counters,
    ]) {
      await context.db.collection(name).deleteMany({});
    }
    await seedCatalog(context.db);
  });

  function reserve(body: Record<string, unknown>) {
    return client.post('/api/reservation').send(body);
  }

  const simple = {
    salaId: 12,
    solicitanteId: 2,
    horaInicio: '2026-08-24T08:00',
    horaFim: '2026-08-24T10:00',
  };

  describe('POST /api/reservation (simples)', () => {
    it('cria e responde 201 com os campos em inglês', async () => {
      const response = await reserve({ ...simple, observacoes: 'Consulta' }).expect(201);

      expect(response.body).toEqual({
        id: 7714,
        startDate: '2026-08-24T08:00:00',
        endDate: '2026-08-24T10:00:00',
        requesterName: 'Dra. Ana Souza',
        roomName: 'Pediatria - Sala 01',
      });
    });

    it('omite `recurrenceId` quando a reserva não é fixa', async () => {
      const response = await reserve(simple).expect(201);
      expect(response.body).not.toHaveProperty('recurrenceId');
    });

    it('serializa as datas sem fuso, para o calendário não deslocar', async () => {
      const response = await reserve(simple).expect(201);

      expect(response.body.startDate).toBe('2026-08-24T08:00:00');
      expect(response.body.startDate).not.toContain('Z');
    });

    it('rejeita sobreposição com 400', async () => {
      await reserve(simple).expect(201);

      const response = await reserve({
        ...simple,
        horaInicio: '2026-08-24T09:00',
        horaFim: '2026-08-24T11:00',
      }).expect(400);

      expect(response.body.message).toBe(
        'Já existe uma reserva para esta sala no horário solicitado!',
      );
    });

    it('permite reservas encostadas, sem intervalo entre elas', async () => {
      await reserve(simple).expect(201);
      await reserve({
        ...simple,
        horaInicio: '2026-08-24T10:00',
        horaFim: '2026-08-24T12:00',
      }).expect(201);
    });

    it('permite o mesmo horário em salas diferentes', async () => {
      await reserve(simple).expect(201);
      await reserve({ ...simple, salaId: 13 }).expect(201);
    });

    it('ignora reserva cancelada ao checar conflito', async () => {
      const created = await reserve(simple).expect(201);
      await client.patch(`/api/reservation/${created.body.id}`).expect(204);

      await reserve(simple).expect(201);
    });

    it('rejeita início posterior ao fim com 406', async () => {
      const response = await reserve({
        ...simple,
        horaInicio: '2026-08-24T11:00',
        horaFim: '2026-08-24T09:00',
      }).expect(406);

      expect(response.body.message).toBe(
        'A hora de início não pode ser maior que a hora fim da reserva.',
      );
    });

    it('rejeita sala inexistente com 400', async () => {
      const response = await reserve({ ...simple, salaId: 999 }).expect(400);
      expect(response.body.message).toBe('Sala não encontrada!');
    });

    it('rejeita solicitante inexistente com 400', async () => {
      const response = await reserve({ ...simple, solicitanteId: 999 }).expect(400);
      expect(response.body.message).toBe('Solicitante não encontrado');
    });
  });

  describe('POST /api/reservation (fixa)', () => {
    const recurrent = {
      salaId: 12,
      solicitanteId: 2,
      horaInicio: '2026-08-24T08:00',
      horaFim: '2026-09-07T10:00',
      fixo: true,
      dias: [1],
    };

    it('devolve apenas os três campos preenchidos, com os nulos omitidos', async () => {
      const response = await reserve(recurrent).expect(201);

      expect(response.body).toEqual({
        requesterName: 'Dra. Ana Souza',
        roomName: 'Pediatria - Sala 01',
        recurrenceId: 1,
      });
    });

    it('gera uma reserva por ocorrência do dia da semana', async () => {
      await reserve(recurrent).expect(201);

      const created = await context.db
        .collection(COLLECTIONS.reservations)
        .find({ recurrenceId: 1 })
        .sort({ startDate: 1 })
        .toArray();

      expect(created).toHaveLength(3);
      expect(created.map((r) => r.startDate.toISOString())).toEqual([
        '2026-08-24T08:00:00.000Z',
        '2026-08-31T08:00:00.000Z',
        '2026-09-07T08:00:00.000Z',
      ]);
    });

    it('aplica o horário dos extremos a todas as ocorrências', async () => {
      await reserve(recurrent).expect(201);

      const created = await context.db
        .collection(COLLECTIONS.reservations)
        .find({ recurrenceId: 1 })
        .toArray();

      expect(created.every((r) => r.endDate.getUTCHours() === 10)).toBe(true);
    });

    it('aborta a série inteira quando uma única ocorrência conflita', async () => {
      await reserve({
        salaId: 12,
        solicitanteId: 3,
        horaInicio: '2026-08-31T09:00',
        horaFim: '2026-08-31T11:00',
      }).expect(201);

      await reserve(recurrent).expect(400);

      const created = await context.db
        .collection(COLLECTIONS.reservations)
        .countDocuments({ recurrenceId: { $ne: null } });
      expect(created).toBe(0);
    });

    it('rejeita com 406 quando nenhum dia da semana cabe no período', async () => {
      const response = await reserve({
        ...recurrent,
        horaInicio: '2026-08-25T08:00',
        horaFim: '2026-08-27T10:00',
        dias: [7],
      }).expect(406);

      expect(response.body.message).toBe('Nenhuma reserva foi criada!');
    });

    it('incrementa o id de recorrência a cada nova série', async () => {
      const first = await reserve(recurrent).expect(201);
      const second = await reserve({ ...recurrent, salaId: 13 }).expect(201);

      expect(first.body.recurrenceId).toBe(1);
      expect(second.body.recurrenceId).toBe(2);
    });
  });

  describe('GET /api/reservation', () => {
    beforeEach(async () => {
      await reserve({ ...simple, observacoes: 'Consulta' }).expect(201);
    });

    it('devolve o envelope de paginação com `reservationId`', async () => {
      const response = await client.get(`/api/reservation?${PERIOD}&page=0&size=10`).expect(200);

      expect(response.body.page.totalElements).toBe(1);
      expect(response.body.content[0]).toEqual({
        reservationId: 7714,
        horaInicio: '2026-08-24T08:00:00',
        horaFim: '2026-08-24T10:00:00',
        sala: 'Pediatria - Sala 01',
        solicitante: 'Dra. Ana Souza',
        setor: 'Pediatria',
        criador: 'Brenda HU',
        salaId: 12,
        solicitanteId: 2,
        setorId: 4,
        profissionalAusente: false,
      });
    });

    it('exige o parâmetro `inicio`', async () => {
      const response = await client
        .get('/api/reservation?fim=2026-09-30T23:59:59')
        .expect(400);

      expect(response.body.message).toContain("'inicio'");
    });

    it('rejeita data fora do formato com 406', async () => {
      await client.get('/api/reservation?inicio=01/08/2026&fim=2026-09-30T23:59:59').expect(406);
    });

    it('exclui reservas fora do período', async () => {
      const response = await client
        .get('/api/reservation?inicio=2026-10-01T00:00:00&fim=2026-10-31T23:59:59')
        .expect(200);

      expect(response.body.page.totalElements).toBe(0);
      expect(response.body.content).toEqual([]);
    });

    it('inclui reserva que apenas cruza a borda do período', async () => {
      const response = await client
        .get('/api/reservation?inicio=2026-08-24T09:00:00&fim=2026-08-24T09:30:00')
        .expect(200);

      expect(response.body.page.totalElements).toBe(1);
    });

    it('filtra por sala, setor e solicitante', async () => {
      await client.get(`/api/reservation?${PERIOD}&salaId=13`).expect(200, /"totalElements":0/);
      await client.get(`/api/reservation?${PERIOD}&setorId=4`).expect(200, /"totalElements":1/);
      await client
        .get(`/api/reservation?${PERIOD}&solicitante=ana`)
        .expect(200, /"totalElements":1/);
    });

    it('não lista reserva cancelada', async () => {
      await client.patch('/api/reservation/7714').expect(204);

      const response = await client.get(`/api/reservation?${PERIOD}`).expect(200);
      expect(response.body.page.totalElements).toBe(0);
    });

    it('marca profissionalAusente quando há ausência no dia da reserva', async () => {
      await context.db.collection(COLLECTIONS.requesterAbsences).insertOne({
        _id: 1,
        requesterId: 2,
        startDate: at('2026-08-20T00:00:00'),
        endDate: at('2026-08-30T00:00:00'),
        createdAt: at('2026-08-01T00:00:00'),
        updatedAt: null,
        updatedBy: null,
      } as never);

      const response = await client.get(`/api/reservation?${PERIOD}`).expect(200);
      expect(response.body.content[0].profissionalAusente).toBe(true);
    });

    it('não marca ausência de outro solicitante', async () => {
      await context.db.collection(COLLECTIONS.requesterAbsences).insertOne({
        _id: 1,
        requesterId: 3,
        startDate: at('2026-08-20T00:00:00'),
        endDate: at('2026-08-30T00:00:00'),
        createdAt: at('2026-08-01T00:00:00'),
        updatedAt: null,
        updatedBy: null,
      } as never);

      const response = await client.get(`/api/reservation?${PERIOD}`).expect(200);
      expect(response.body.content[0].profissionalAusente).toBe(false);
    });

    it('não marca ausência que termina antes do dia da reserva', async () => {
      await context.db.collection(COLLECTIONS.requesterAbsences).insertOne({
        _id: 1,
        requesterId: 2,
        startDate: at('2026-08-10T00:00:00'),
        endDate: at('2026-08-23T00:00:00'),
        createdAt: at('2026-08-01T00:00:00'),
        updatedAt: null,
        updatedBy: null,
      } as never);

      const response = await client.get(`/api/reservation?${PERIOD}`).expect(200);
      expect(response.body.content[0].profissionalAusente).toBe(false);
    });
  });

  describe('GET /api/reservation — busca, tipo e ordenação', () => {
    const ids = (body: { content: { reservationId: number }[] }) =>
      body.content.map((r) => r.reservationId);

    function list(params: string) {
      return client.get(`/api/reservation?${PERIOD}&page=0&size=20&${params}`).expect(200);
    }

    // 7714: Pediatria - Sala 01, Ana, 24/08 · 7715: Oftalmologia - Sala 05, Bruno, 20/08
    // 7716 e 7717: série fixa na Pediatria - Sala 02, Ana, 24/08 e 31/08
    beforeEach(async () => {
      await reserve(simple).expect(201);
      await reserve({
        salaId: 36,
        solicitanteId: 3,
        horaInicio: '2026-08-20T08:00',
        horaFim: '2026-08-20T10:00',
      }).expect(201);
      await reserve({
        salaId: 13,
        solicitanteId: 2,
        horaInicio: '2026-08-24T08:00',
        horaFim: '2026-08-31T10:00',
        fixo: true,
        dias: [1],
      }).expect(201);
    });

    it('mantém a ordem por recência quando `sort` não é enviado', async () => {
      const response = await list('');

      expect(ids(response.body)).toEqual([7717, 7716, 7715, 7714]);
    });

    it('busca no nome da sala e do setor, ignorando maiúsculas', async () => {
      expect(ids((await list('busca=OFTALMO')).body)).toEqual([7715]);
      expect(ids((await list('busca=sala 02')).body)).toEqual([7717, 7716]);
    });

    it('busca no nome do solicitante', async () => {
      expect(ids((await list('busca=bruno')).body)).toEqual([7715]);
    });

    it('busca no nome de quem criou a reserva', async () => {
      const response = await list('busca=brenda');

      expect(response.body.page.totalElements).toBe(4);
    });

    it('devolve vazio quando a busca não encontra nada, com total zerado', async () => {
      const response = await list('busca=inexistente');

      expect(response.body.content).toEqual([]);
      expect(response.body.page.totalElements).toBe(0);
    });

    it('filtra só as fixas com recorrente=true', async () => {
      expect(ids((await list('recorrente=true')).body)).toEqual([7717, 7716]);
    });

    it('filtra só as pontuais com recorrente=false', async () => {
      expect(ids((await list('recorrente=false')).body)).toEqual([7715, 7714]);
    });

    it('ignora `recorrente` com valor inválido, sem responder erro', async () => {
      const response = await list('recorrente=talvez');

      expect(response.body.page.totalElements).toBe(4);
    });

    it('ordena por horário de início crescente, desempatando por id', async () => {
      expect(ids((await list('sort=horaInicio,asc')).body)).toEqual([7715, 7714, 7716, 7717]);
    });

    it('ordena por sala crescente', async () => {
      expect(ids((await list('sort=sala,asc')).body)).toEqual([7715, 7714, 7716, 7717]);
    });

    it('ordena por solicitante decrescente', async () => {
      expect(ids((await list('sort=solicitante,desc')).body)).toEqual([7717, 7716, 7714, 7715]);
    });

    it('ignora `sort` fora da lista permitida e mantém a recência', async () => {
      expect(ids((await list('sort=criador,asc')).body)).toEqual([7717, 7716, 7715, 7714]);
    });

    it('combina busca, tipo e ordenação com os filtros existentes', async () => {
      const response = await list('busca=pediatria&recorrente=true&setorId=4&sort=horaInicio,desc');

      expect(ids(response.body)).toEqual([7717, 7716]);
    });
  });

  describe('GET /api/reservation/current-month', () => {
    it('devolve array puro, sem envelope', async () => {
      const response = await client.get('/api/reservation/current-month').expect(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    /** Reserva das 08:00 às 10:00 (horário de parede) no dia 15 do mês informado (0 = janeiro). */
    async function insertReservationOnDay15(id: number, year: number, month: number) {
      await context.db.collection(COLLECTIONS.reservations).insertOne({
        _id: id,
        roomId: 12,
        requesterId: 2,
        startDate: new Date(Date.UTC(year, month, 15, 8, 0, 0)),
        endDate: new Date(Date.UTC(year, month, 15, 10, 0, 0)),
        observations: null,
        status: 1,
        recurrenceId: null,
        createdAt: new Date(),
        updatedAt: null,
        updatedBy: 5,
      } as never);
    }

    it('traz as reservas do mês corrente', async () => {
      // O mês corrente é o de São Paulo, o mesmo relógio que o serviço usa.
      const today = nowWallClock();
      await insertReservationOnDay15(8000, today.getUTCFullYear(), today.getUTCMonth());

      const response = await client.get('/api/reservation/current-month').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].reservationId).toBe(8000);
    });

    describe('na virada do mês', () => {
      // 01/08/2025 01:30 em UTC ainda é 31/07/2025 22:30 em São Paulo: o mês corrente é julho.
      const UTC_INSTANT_STILL_JULY_IN_SAO_PAULO = new Date('2025-08-01T01:30:00Z');

      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
        vi.setSystemTime(UTC_INSTANT_STILL_JULY_IN_SAO_PAULO);
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('usa o mês de São Paulo, e não o de UTC', async () => {
        await insertReservationOnDay15(8001, 2025, 6);
        await insertReservationOnDay15(8002, 2025, 7);

        const response = await client.get('/api/reservation/current-month').expect(200);

        expect(response.body.map((item: { reservationId: number }) => item.reservationId)).toEqual(
          [8001],
        );
      });
    });
  });

  describe('cancelamentos', () => {
    it('cancela reserva pontual com PATCH e responde 204', async () => {
      const created = await reserve(simple).expect(201);
      await client.patch(`/api/reservation/${created.body.id}`).expect(204);

      const reservation = await context.db
        .collection(COLLECTIONS.reservations)
        .findOne({ _id: created.body.id });
      expect(reservation?.status).toBe(2);
    });

    it('responde 400 ao cancelar reserva já cancelada', async () => {
      const created = await reserve(simple).expect(201);
      await client.patch(`/api/reservation/${created.body.id}`).expect(204);

      const response = await client.patch(`/api/reservation/${created.body.id}`).expect(400);
      expect(response.body.message).toBe(
        `Nenhuma reserva ativa encontrada para este ID: ${created.body.id}`,
      );
    });

    it('cancela a série inteira com DELETE', async () => {
      await reserve({
        salaId: 12,
        solicitanteId: 2,
        horaInicio: '2026-08-24T08:00',
        horaFim: '2026-09-07T10:00',
        fixo: true,
        dias: [1],
      }).expect(201);

      await client.delete('/api/reservation/recurrent/1').expect(204);

      const remaining = await context.db
        .collection(COLLECTIONS.reservations)
        .countDocuments({ recurrenceId: 1, status: 1 });
      expect(remaining).toBe(0);
    });

    it('responde 400 para recorrência inexistente', async () => {
      const response = await client.delete('/api/reservation/recurrent/999').expect(400);
      expect(response.body.message).toBe('Nenhuma reserva ativa encontrada para este ID: 999');
    });
  });
});
