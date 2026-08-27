import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { COLLECTIONS } from '../src/database/documents';
import { RequesterAbsencesModule } from '../src/requester-absences/requester-absences.module';
import { RequestersModule } from '../src/requesters/requesters.module';
import { authed, basicToken, seedCatalog, seedUsers } from './support/fixtures';
import { TestApp, createTestApp } from './support/test-app';

describe('Solicitantes e ausências', () => {
  let context: TestApp;
  let client: ReturnType<typeof authed>;

  beforeAll(async () => {
    context = await createTestApp([RequestersModule, RequesterAbsencesModule]);
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
      COLLECTIONS.counters,
    ]) {
      await context.db.collection(name).deleteMany({});
    }
    await seedCatalog(context.db);
  });

  describe('GET /api/requester', () => {
    it('usa `contato` na leitura, não `telefone`', async () => {
      const response = await client.get('/api/requester?page=0&size=10').expect(200);
      const ana = response.body.content.find((r: { id: number }) => r.id === 2);

      expect(ana).toEqual({
        id: 2,
        nome: 'Dra. Ana Souza',
        contato: '79999010001',
        especialidade: 'Cardiologia',
      });
    });

    it('devolve o envelope de paginação', async () => {
      const response = await client.get('/api/requester?page=0&size=1').expect(200);

      expect(response.body.page).toEqual({
        size: 1,
        number: 0,
        totalElements: 2,
        totalPages: 2,
      });
    });

    it('devolve array puro com unpaged=true', async () => {
      const response = await client.get('/api/requester?unpaged=true').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('busca por nome ignorando maiúsculas', async () => {
      const response = await client.get('/api/requester?busca=ana').expect(200);

      expect(response.body.content).toHaveLength(1);
      expect(response.body.content[0].nome).toBe('Dra. Ana Souza');
    });

    it('busca por especialidade com o mesmo parâmetro', async () => {
      const response = await client.get('/api/requester?busca=neuro').expect(200);

      expect(response.body.content).toHaveLength(1);
      expect(response.body.content[0].nome).toBe('Dr. Bruno Lima');
    });

    it('busca por telefone com o mesmo parâmetro', async () => {
      const response = await client.get('/api/requester?busca=010002').expect(200);

      expect(response.body.content).toHaveLength(1);
      expect(response.body.content[0].id).toBe(3);
    });

    it('não lista solicitantes inativos', async () => {
      await client.delete('/api/requester/2').expect(204);

      const response = await client.get('/api/requester').expect(200);
      expect(response.body.page.totalElements).toBe(1);
    });

    it('mantém o solicitante inativo acessível por id', async () => {
      await client.delete('/api/requester/2').expect(204);

      const response = await client.get('/api/requester/2').expect(200);
      expect(response.body.nome).toBe('Dra. Ana Souza');
    });

    it('responde 400 com mensagem sem exclamação para id inexistente', async () => {
      const response = await client.get('/api/requester/999').expect(400);
      expect(response.body.message).toBe('Solicitante não encontrado');
    });
  });

  describe('POST e PUT /api/requester', () => {
    it('cria devolvendo `telefone` na escrita', async () => {
      const response = await client
        .post('/api/requester')
        .send({ nome: 'Dra. Carla', telefone: '79999010003', especialidade: 'Ortopedia' })
        .expect(201);

      expect(response.body).toEqual({
        id: 275,
        nome: 'Dra. Carla',
        telefone: '79999010003',
        especialidade: 'Ortopedia',
      });
    });

    it('converte telefone em branco para ausente na resposta', async () => {
      const response = await client
        .post('/api/requester')
        .send({ nome: 'Dra. Carla', telefone: '   ', especialidade: 'Ortopedia' })
        .expect(201);

      expect(response.body).not.toHaveProperty('telefone');
    });

    it('rejeita nome em branco com 400', async () => {
      const response = await client
        .post('/api/requester')
        .send({ nome: '  ', especialidade: 'Ortopedia' })
        .expect(400);

      expect(response.body.message).toBe('O nome do solicitante não deve ser deixado em branco!');
    });

    it('atualiza nome e especialidade', async () => {
      const response = await client
        .put('/api/requester/2')
        .send({ nome: 'Dra. Ana S.', telefone: '79999010009', especialidade: 'Cardiologia Geral' })
        .expect(200);

      expect(response.body).toEqual({
        id: 2,
        nome: 'Dra. Ana S.',
        telefone: '79999010009',
        especialidade: 'Cardiologia Geral',
      });
    });

    it('preserva nome e especialidade quando vêm em branco', async () => {
      const response = await client
        .put('/api/requester/2')
        .send({ nome: '', telefone: '79999010001', especialidade: '   ' })
        .expect(200);

      expect(response.body.nome).toBe('Dra. Ana Souza');
      expect(response.body.especialidade).toBe('Cardiologia');
    });

    it('apaga o telefone quando vem vazio, diferente dos demais campos', async () => {
      const response = await client
        .put('/api/requester/2')
        .send({ nome: 'Dra. Ana Souza', telefone: '', especialidade: 'Cardiologia' })
        .expect(200);

      expect(response.body).not.toHaveProperty('telefone');
    });
  });

  describe('/api/requester-absence', () => {
    function createAbsence(body: Record<string, unknown>) {
      return client.post('/api/requester-absence').send(body);
    }

    it('cria devolvendo as datas no formato yyyy-MM-dd', async () => {
      const response = await createAbsence({
        solicitanteId: 2,
        dataInicio: '2026-09-01',
        dataFim: '2026-09-10',
      }).expect(201);

      expect(response.body).toEqual({
        id: 3,
        solicitanteId: 2,
        solicitanteNome: 'Dra. Ana Souza',
        dataInicio: '2026-09-01',
        dataFim: '2026-09-10',
      });
    });

    it('aceita período de um único dia', async () => {
      const response = await createAbsence({
        solicitanteId: 2,
        dataInicio: '2026-09-01',
        dataFim: '2026-09-01',
      }).expect(201);

      expect(response.body.dataInicio).toBe(response.body.dataFim);
    });

    it('rejeita início posterior ao fim com 406', async () => {
      const response = await createAbsence({
        solicitanteId: 2,
        dataInicio: '2026-09-10',
        dataFim: '2026-09-01',
      }).expect(406);

      expect(response.body).toMatchObject({
        status: 406,
        error: 'Not Acceptable',
        message: 'A data de início não pode ser posterior à data de fim.',
      });
    });

    it('rejeita solicitante inexistente com 400', async () => {
      const response = await createAbsence({
        solicitanteId: 999,
        dataInicio: '2026-09-01',
        dataFim: '2026-09-10',
      }).expect(400);

      expect(response.body.message).toBe('Solicitante não encontrado');
    });

    it('rejeita data fora do formato com 400', async () => {
      await createAbsence({
        solicitanteId: 2,
        dataInicio: '01/09/2026',
        dataFim: '2026-09-10',
      }).expect(400);
    });

    it('devolve array puro, sem envelope de paginação', async () => {
      await createAbsence({ solicitanteId: 2, dataInicio: '2026-09-01', dataFim: '2026-09-10' });

      const response = await client.get('/api/requester-absence').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('filtra por solicitanteId', async () => {
      await createAbsence({ solicitanteId: 2, dataInicio: '2026-09-01', dataFim: '2026-09-10' });
      await createAbsence({ solicitanteId: 3, dataInicio: '2026-10-01', dataFim: '2026-10-05' });

      const response = await client.get('/api/requester-absence?solicitanteId=3').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].solicitanteNome).toBe('Dr. Bruno Lima');
    });

    it('ordena por data de início decrescente ao filtrar por solicitante', async () => {
      await createAbsence({ solicitanteId: 2, dataInicio: '2026-09-01', dataFim: '2026-09-10' });
      await createAbsence({ solicitanteId: 2, dataInicio: '2026-11-01', dataFim: '2026-11-05' });

      const response = await client.get('/api/requester-absence?solicitanteId=2').expect(200);

      expect(response.body.map((a: { dataInicio: string }) => a.dataInicio)).toEqual([
        '2026-11-01',
        '2026-09-01',
      ]);
    });

    it('atualiza trocando o solicitante e o período', async () => {
      const created = await createAbsence({
        solicitanteId: 2,
        dataInicio: '2026-09-01',
        dataFim: '2026-09-10',
      }).expect(201);

      const response = await client
        .put(`/api/requester-absence/${created.body.id}`)
        .send({ solicitanteId: 3, dataInicio: '2026-09-02', dataFim: '2026-09-12' })
        .expect(200);

      expect(response.body).toMatchObject({
        solicitanteId: 3,
        solicitanteNome: 'Dr. Bruno Lima',
        dataInicio: '2026-09-02',
        dataFim: '2026-09-12',
      });
    });

    it('exclui em definitivo, sem soft delete', async () => {
      const created = await createAbsence({
        solicitanteId: 2,
        dataInicio: '2026-09-01',
        dataFim: '2026-09-10',
      }).expect(201);

      await client.delete(`/api/requester-absence/${created.body.id}`).expect(204);

      const remaining = await context.db
        .collection(COLLECTIONS.requesterAbsences)
        .countDocuments({});
      expect(remaining).toBe(0);
    });

    it('responde 400 ao excluir ausência inexistente, com o id na mensagem', async () => {
      const response = await client.delete('/api/requester-absence/999').expect(400);
      expect(response.body.message).toBe('Ausência não encontrada: 999');
    });
  });
});
