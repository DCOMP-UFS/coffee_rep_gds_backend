import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller';
import { Module } from '@nestjs/common';
import { UsersModule } from '../src/users/users.module';
import { COLLECTIONS } from '../src/database/documents';
import { ADMIN_CPF, DEFAULT_PASSWORD, adminToken, authed, basicToken, seedUsers } from './support/fixtures';
import { TestApp, createTestApp } from './support/test-app';

@Module({ controllers: [HealthController] })
class HealthModule {}

describe('Auth e usuários', () => {
  let context: TestApp;

  beforeAll(async () => {
    context = await createTestApp([UsersModule, HealthModule]);
    await seedUsers(context.db);
  });

  afterAll(async () => {
    await context.close();
  });

  const http = () => request(context.app.getHttpServer());

  describe('rotas públicas', () => {
    it('GET /api/health responde sem token, para o warmup do frontend', async () => {
      const response = await http().get('/api/health').expect(200);
      expect(response.body).toEqual({ status: 'UP' });
    });

    it('GET /hello responde texto puro sem token', async () => {
      const response = await http().get('/hello').expect(200);
      expect(response.text).toBe('Hello World!');
    });
  });

  describe('POST /api/auth/login', () => {
    it('autentica por CPF e devolve accessToken com expiresIn em segundos', async () => {
      const response = await http()
        .post('/api/auth/login')
        .send({ cpf: ADMIN_CPF, password: DEFAULT_PASSWORD })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.expiresIn).toBe(86400);
    });

    it('emite o token com os claims do backend Java', async () => {
      const response = await http()
        .post('/api/auth/login')
        .send({ cpf: ADMIN_CPF, password: DEFAULT_PASSWORD })
        .expect(200);

      const payload = JSON.parse(
        Buffer.from(response.body.accessToken.split('.')[1], 'base64url').toString(),
      );

      expect(payload.iss).toBe('GDS_backend');
      expect(payload.sub).toBe('1');
      expect(payload.scope).toBe('ADMIN');
      expect(payload.exp - payload.iat).toBe(86400);
    });

    it('responde 401 para senha incorreta, sem revelar qual campo falhou', async () => {
      const response = await http()
        .post('/api/auth/login')
        .send({ cpf: ADMIN_CPF, password: 'errada' })
        .expect(401);

      expect(response.body.message).toBe('Invalid username or password');
    });

    it('responde 401 para CPF inexistente com a mesma mensagem', async () => {
      const response = await http()
        .post('/api/auth/login')
        .send({ cpf: '30577082426', password: DEFAULT_PASSWORD })
        .expect(401);

      expect(response.body.message).toBe('Invalid username or password');
    });
  });

  describe('POST /api/auth/register', () => {
    it('cria usuário BASIC e responde 200 com corpo vazio', async () => {
      await http()
        .post('/api/auth/register')
        .send({
          name: 'Rafaela HU',
          phone: '99999999999',
          password: 'segredo',
          email: 'rafaela@teste.com',
          cpf: '30577082426',
          birthDate: '2000-01-01',
        })
        .expect(200)
        .expect(({ text }) => expect(text).toBe(''));

      const created = await context.db
        .collection(COLLECTIONS.users)
        .findOne({ cpf: '30577082426' });

      expect(created?.roles).toEqual(['BASIC']);
      expect(created?.status).toBe(1);
      expect(created?.password).not.toBe('segredo');
    });

    it('rejeita CPF duplicado com 400 e mensagem de negócio', async () => {
      const response = await http()
        .post('/api/auth/register')
        .send({
          name: 'Outro',
          phone: '999',
          password: 'x',
          email: 'outro@teste.com',
          cpf: ADMIN_CPF,
          birthDate: '2000-01-01',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        status: 400,
        error: 'Bad Request',
        message: 'Este CPF já está cadastrado.',
        path: '/api/auth/register',
      });
    });

    it('rejeita e-mail duplicado com 400', async () => {
      const response = await http()
        .post('/api/auth/register')
        .send({
          name: 'Outro',
          phone: '999',
          password: 'x',
          email: 'admin@admin.com',
          cpf: '17055661030',
          birthDate: '2000-01-01',
        })
        .expect(400);

      expect(response.body.message).toBe('Este e-mail já está cadastrado.');
    });

    it('rejeita data de nascimento fora do formato com 406', async () => {
      const response = await http()
        .post('/api/auth/register')
        .send({
          name: 'Outro',
          phone: '999',
          password: 'x',
          email: 'novo@teste.com',
          cpf: '17055661030',
          birthDate: '01/01/2000',
        })
        .expect(406);

      expect(response.body).toMatchObject({
        status: 406,
        error: 'Not Acceptable',
        message: 'O formato da data de aniversário deve ser [yyyy-MM-dd].',
      });
    });

    it('rejeita CPF inválido com 400 e apenas a primeira mensagem de validação', async () => {
      const response = await http()
        .post('/api/auth/register')
        .send({
          name: 'Outro',
          phone: '999',
          password: 'x',
          email: 'novo@teste.com',
          cpf: '11111111111',
          birthDate: '2000-01-01',
        })
        .expect(400);

      expect(typeof response.body.message).toBe('string');
    });
  });

  describe('proteção das rotas', () => {
    it('responde 401 sem token', async () => {
      const response = await http().get('/api/user').expect(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
    });

    it('responde 401 com token malformado', async () => {
      await http().get('/api/user').set('Authorization', 'Bearer nao-e-um-jwt').expect(401);
    });

    it('permite acesso com token válido', async () => {
      const token = await basicToken(context.app);
      const response = await authed(context.app, token).get('/api/user/noauthority').expect(200);
      expect(response.text).toBe('Brenda HU');
    });
  });

  describe('autorização por authority', () => {
    it('GET /api/user exige SCOPE_ADMIN', async () => {
      const token = await adminToken(context.app);
      const response = await authed(context.app, token).get('/api/user').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toMatchObject({ userId: 1, name: 'Admin' });
      expect(response.body[0].roles).toEqual([{ roleId: 1, name: 'ADMIN' }]);
    });

    it('GET /api/user responde 403 para usuário BASIC', async () => {
      const token = await basicToken(context.app);
      const response = await authed(context.app, token).get('/api/user').expect(403);

      expect(response.body).toMatchObject({ status: 403, error: 'Forbidden' });
    });

    it('não expõe o hash da senha na listagem de usuários', async () => {
      const token = await adminToken(context.app);
      const response = await authed(context.app, token).get('/api/user').expect(200);

      expect(response.body[0]).not.toHaveProperty('password');
    });

    it('omite campos nulos da resposta, como o Jackson NON_NULL', async () => {
      const token = await adminToken(context.app);
      const response = await authed(context.app, token).get('/api/user').expect(200);

      expect(response.body[0]).not.toHaveProperty('updatedAt');
      expect(response.body[0]).not.toHaveProperty('updatedBy');
    });
  });
});
