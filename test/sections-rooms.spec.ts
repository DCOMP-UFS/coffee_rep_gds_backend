import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { COLLECTIONS, STATUS_INACTIVE } from '../src/database/documents';
import { RoomsModule } from '../src/rooms/rooms.module';
import { SectionsModule } from '../src/sections/sections.module';
import { authed, basicToken, seedCatalog, seedUsers } from './support/fixtures';
import { TestApp, createTestApp } from './support/test-app';

describe('Setores e salas', () => {
  let context: TestApp;
  let client: ReturnType<typeof authed>;

  beforeAll(async () => {
    context = await createTestApp([SectionsModule, RoomsModule]);
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
      COLLECTIONS.counters,
    ]) {
      await context.db.collection(name).deleteMany({});
    }
    await seedCatalog(context.db);
  });

  describe('GET /api/section', () => {
    it('devolve o envelope de paginação com metadados aninhados em `page`', async () => {
      const response = await client.get('/api/section?page=0&size=5').expect(200);

      expect(response.body.page).toEqual({
        size: 5,
        number: 0,
        totalElements: 2,
        totalPages: 1,
      });
      expect(response.body.content).toHaveLength(2);
    });

    it('usa `observacoes` no plural na leitura', async () => {
      const response = await client.get('/api/section').expect(200);
      const pediatria = response.body.content.find((s: { id: number }) => s.id === 4);

      expect(pediatria).toEqual({ id: 4, nome: 'Pediatria', observacoes: 'Ala infantil' });
    });

    it('omite `observacoes` quando é nula', async () => {
      const response = await client.get('/api/section').expect(200);
      const oftalmo = response.body.content.find((s: { id: number }) => s.id === 8);

      expect(oftalmo).toEqual({ id: 8, nome: 'Oftalmologia' });
    });

    it('devolve array puro com unpaged=true, sem envelope', async () => {
      const response = await client.get('/api/section?unpaged=true').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('filtra por nome ignorando maiúsculas', async () => {
      const response = await client.get('/api/section?name=pedia').expect(200);

      expect(response.body.content).toHaveLength(1);
      expect(response.body.content[0].nome).toBe('Pediatria');
    });

    it('não lista setores inativos', async () => {
      await context.db
        .collection(COLLECTIONS.sections)
        .updateOne({ _id: 8 as never }, { $set: { status: STATUS_INACTIVE } });

      const response = await client.get('/api/section').expect(200);
      expect(response.body.page.totalElements).toBe(1);
    });
  });

  describe('POST /api/section', () => {
    it('cria e responde 201 usando `observacao` no singular', async () => {
      const response = await client
        .post('/api/section')
        .send({ nome: 'Cardiologia', observacao: 'Terceiro andar' })
        .expect(201);

      expect(response.body).toEqual({
        id: 22,
        nome: 'Cardiologia',
        observacao: 'Terceiro andar',
      });
    });

    it('rejeita nome duplicado de setor ativo com 400', async () => {
      const response = await client.post('/api/section').send({ nome: 'Pediatria' }).expect(400);

      expect(response.body.message).toBe('Já existe um setor com esse nome!');
    });

    it('reativa o setor inativo homônimo preservando o id', async () => {
      await context.db
        .collection(COLLECTIONS.sections)
        .updateOne({ _id: 8 as never }, { $set: { status: STATUS_INACTIVE } });

      const response = await client.post('/api/section').send({ nome: 'Oftalmologia' }).expect(201);

      expect(response.body.id).toBe(8);
      const section = await context.db
        .collection(COLLECTIONS.sections)
        .findOne({ _id: 8 as never });
      expect(section?.status).toBe(1);
    });

    it('rejeita nome em branco com 400 e a mensagem de validação do Java', async () => {
      const response = await client.post('/api/section').send({ nome: '   ' }).expect(400);

      expect(response.body.message).toBe('O nome do setor não deve ser deixado em branco!');
    });
  });

  describe('PUT /api/section/{id}', () => {
    it('atualiza e responde 200', async () => {
      const response = await client
        .put('/api/section/4')
        .send({ nome: 'Pediatria Geral', observacao: 'Atualizado' })
        .expect(200);

      expect(response.body).toEqual({
        id: 4,
        nome: 'Pediatria Geral',
        observacao: 'Atualizado',
      });
    });

    it('rejeita renomear para o nome de outro setor ativo', async () => {
      const response = await client
        .put('/api/section/4')
        .send({ nome: 'Oftalmologia' })
        .expect(400);

      expect(response.body.message).toBe('Já existe um setor com esse nome!');
    });

    it('permite salvar mantendo o próprio nome', async () => {
      await client.put('/api/section/4').send({ nome: 'Pediatria' }).expect(200);
    });

    it('responde 400 para setor inexistente', async () => {
      const response = await client.put('/api/section/999').send({ nome: 'X' }).expect(400);

      expect(response.body).toMatchObject({
        status: 400,
        error: 'Bad Request',
        message: 'Setor não encontrado!',
      });
    });
  });

  describe('DELETE /api/section/{id}', () => {
    it('responde 204 e inativa o setor', async () => {
      await client.delete('/api/section/4').expect(204);

      const section = await context.db
        .collection(COLLECTIONS.sections)
        .findOne({ _id: 4 as never });
      expect(section?.status).toBe(0);
    });

    it('cascateia a inativação para as salas do setor', async () => {
      await client.delete('/api/section/4').expect(204);

      const rooms = await context.db
        .collection(COLLECTIONS.rooms)
        .find({ sectionId: 4 })
        .toArray();

      expect(rooms).toHaveLength(2);
      expect(rooms.every((room) => room.status === 0)).toBe(true);
    });

    it('não afeta salas de outros setores', async () => {
      await client.delete('/api/section/4').expect(204);

      const room = await context.db.collection(COLLECTIONS.rooms).findOne({ _id: 36 as never });
      expect(room?.status).toBe(1);
    });
  });

  describe('GET /api/room', () => {
    it('devolve nome do setor, id do setor e a flag de ocupação', async () => {
      const response = await client.get('/api/room?page=0&size=10').expect(200);
      const room = response.body.content.find((r: { id: number }) => r.id === 12);

      expect(room).toEqual({
        id: 12,
        nome: 'Pediatria - Sala 01',
        setor: 'Pediatria',
        setorId: 4,
        ocupada: false,
      });
    });

    it('filtra por setor via /api/room/section/{id}', async () => {
      const response = await client.get('/api/room/section/4?page=0&size=10').expect(200);

      expect(response.body.page.totalElements).toBe(2);
      expect(response.body.content.every((r: { setorId: number }) => r.setorId === 4)).toBe(true);
    });

    it('devolve array puro com unpaged=true', async () => {
      const response = await client.get('/api/room/section/4?unpaged=true').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('responde 400 para sala inexistente', async () => {
      const response = await client.get('/api/room/999').expect(400);
      expect(response.body.message).toBe('Sala não encontrada!');
    });
  });

  describe('cálculo de ocupação', () => {
    async function reserveNow(roomId: number, requesterId: number): Promise<void> {
      const now = new Date();
      await context.db.collection(COLLECTIONS.reservations).insertOne({
        _id: 9001,
        roomId,
        requesterId,
        // Janela larga para cobrir o horário de parede independentemente do fuso do CI.
        startDate: new Date(now.getTime() - 48 * 3600_000),
        endDate: new Date(now.getTime() + 48 * 3600_000),
        observations: null,
        status: 1,
        recurrenceId: null,
        createdAt: now,
        updatedAt: null,
        updatedBy: 5,
      } as never);
    }

    it('marca a sala como ocupada quando há reserva aprovada vigente', async () => {
      await reserveNow(12, 2);

      const response = await client.get('/api/room/12').expect(200);
      expect(response.body.ocupada).toBe(true);
    });

    it('ignora reserva cancelada', async () => {
      await reserveNow(12, 2);
      await context.db
        .collection(COLLECTIONS.reservations)
        .updateOne({ _id: 9001 as never }, { $set: { status: 2 } });

      const response = await client.get('/api/room/12').expect(200);
      expect(response.body.ocupada).toBe(false);
    });

    it('libera a sala quando o profissional está em ausência hoje', async () => {
      await reserveNow(12, 2);
      const today = new Date();
      await context.db.collection(COLLECTIONS.requesterAbsences).insertOne({
        _id: 1,
        requesterId: 2,
        startDate: new Date(today.getTime() - 48 * 3600_000),
        endDate: new Date(today.getTime() + 48 * 3600_000),
        createdAt: today,
        updatedAt: null,
        updatedBy: null,
      } as never);

      const response = await client.get('/api/room/12').expect(200);
      expect(response.body.ocupada).toBe(false);
    });

    it('filtra somente ocupadas com ocupada=true', async () => {
      await reserveNow(12, 2);

      const response = await client.get('/api/room?ocupada=true&page=0&size=10').expect(200);

      expect(response.body.page.totalElements).toBe(1);
      expect(response.body.content[0].id).toBe(12);
    });

    it('filtra somente livres com ocupada=false', async () => {
      await reserveNow(12, 2);

      const response = await client.get('/api/room?ocupada=false&page=0&size=10').expect(200);

      expect(response.body.page.totalElements).toBe(2);
      expect(response.body.content.map((r: { id: number }) => r.id).sort()).toEqual([13, 36]);
    });

    it('traz todas quando `ocupada` não é enviado', async () => {
      await reserveNow(12, 2);

      const response = await client.get('/api/room?page=0&size=10').expect(200);
      expect(response.body.page.totalElements).toBe(3);
    });
  });

  describe('POST /api/room', () => {
    it('cria e responde 201 sem setorId nem ocupada no corpo', async () => {
      const response = await client
        .post('/api/room')
        .send({ nome: 'Pediatria - Sala 03', setorId: 4 })
        .expect(201);

      expect(response.body).toEqual({ id: 123, nome: 'Pediatria - Sala 03', setor: 'Pediatria' });
    });

    it('rejeita sala homônima ativa no mesmo setor', async () => {
      const response = await client
        .post('/api/room')
        .send({ nome: 'Pediatria - Sala 01', setorId: 4 })
        .expect(400);

      expect(response.body.message).toBe('Já existe uma sala com este nome!');
    });

    it('permite sala homônima em outro setor', async () => {
      await client
        .post('/api/room')
        .send({ nome: 'Pediatria - Sala 01', setorId: 8 })
        .expect(201);
    });

    it('reativa sala inativa homônima preservando o id', async () => {
      await context.db
        .collection(COLLECTIONS.rooms)
        .updateOne({ _id: 13 as never }, { $set: { status: STATUS_INACTIVE } });

      const response = await client
        .post('/api/room')
        .send({ nome: 'Pediatria - Sala 02', setorId: 4 })
        .expect(201);

      expect(response.body.id).toBe(13);
    });

    it('rejeita setor inexistente ou inativo com 400', async () => {
      const response = await client.post('/api/room').send({ nome: 'X', setorId: 999 }).expect(400);

      expect(response.body.message).toBe('Setor não encontrado');
    });
  });

  describe('PUT e DELETE /api/room/{id}', () => {
    it('atualiza nome e setor', async () => {
      const response = await client
        .put('/api/room/12')
        .send({ nome: 'Sala Renomeada', setorId: 8 })
        .expect(200);

      expect(response.body).toEqual({
        id: 12,
        nome: 'Sala Renomeada',
        setor: 'Oftalmologia',
      });
    });

    it('inativa a sala com 204', async () => {
      await client.delete('/api/room/12').expect(204);

      const room = await context.db.collection(COLLECTIONS.rooms).findOne({ _id: 12 as never });
      expect(room?.status).toBe(0);
    });

    it('responde 400 ao excluir sala já inativa', async () => {
      await client.delete('/api/room/12').expect(204);

      const response = await client.delete('/api/room/12').expect(400);
      expect(response.body.message).toBe('Sala não encontrada!');
    });
  });
});
