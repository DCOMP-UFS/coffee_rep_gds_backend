import { Logger } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { AuditModule } from '../src/audit/audit.module';
import { ROLE_ADMIN, ROLE_ASSISTANT, ROLE_BASIC, ROLE_COORDINATOR, ROLE_VIEWER } from '../src/auth/roles';
import { COLLECTIONS, ROLE_REQUEST_PENDING } from '../src/database/documents';
import { MailService } from '../src/mail/mail.service';
import { applyRoleMigration, inspectRoleMigration } from '../src/role-requests/role-migration';
import { ROLE_REQUEST_MESSAGES } from '../src/role-requests/role-requests.service';
import { RoleRequestsModule } from '../src/role-requests/role-requests.module';
import { ADMIN_ROLE_LOCKED_MESSAGE, DIRECT_CHANGE_NOTE } from '../src/role-requests/user-roles.service';
import { SectionsModule } from '../src/sections/sections.module';
import { UsersModule } from '../src/users/users.module';
import {
  ASSISTANT_USER,
  COORDINATOR_USER,
  VIEWER_USER,
  adminToken,
  assistantToken,
  authed,
  coordinatorToken,
  seedUsers,
  tokenFor,
  viewerToken,
} from './support/fixtures';
import { TestApp, createTestApp } from './support/test-app';

const JUSTIFICATION = 'Preciso reservar salas pontuais para a recepção.';

describe('Pedidos de elevação de acesso', () => {
  let context: TestApp;
  let viewer: ReturnType<typeof authed>;
  let assistant: ReturnType<typeof authed>;
  let coordinator: ReturnType<typeof authed>;
  let admin: ReturnType<typeof authed>;
  let notify: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    context = await createTestApp([UsersModule, AuditModule, SectionsModule, RoleRequestsModule]);
    viewer = authed(context.app, await viewerToken(context.app));
    assistant = authed(context.app, await assistantToken(context.app));
    coordinator = authed(context.app, await coordinatorToken(context.app));
    admin = authed(context.app, await adminToken(context.app));
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    for (const name of [
      COLLECTIONS.users,
      COLLECTIONS.roleRequests,
      COLLECTIONS.auditEvents,
      COLLECTIONS.counters,
    ]) {
      await context.db.collection(name).deleteMany({});
    }
    await seedUsers(context.db);
    notify = vi.spyOn(MailService.prototype, 'notifyNewRoleRequest');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function requestAccess(client = viewer, requestedRole = ROLE_ASSISTANT) {
    return client.post('/api/role-request').send({ requestedRole, justification: JUSTIFICATION });
  }

  async function rolesOf(userId: number): Promise<string[]> {
    const user = await context.db.collection(COLLECTIONS.users).findOne({ _id: userId as never });
    return user?.roles;
  }

  describe('GET /api/auth/me', () => {
    it('devolve perfil e permissões calculadas no backend', async () => {
      const response = await assistant.get('/api/auth/me').expect(200);

      expect(response.body).toEqual({
        id: ASSISTANT_USER.id,
        name: ASSISTANT_USER.name,
        email: ASSISTANT_USER.email,
        role: ROLE_ASSISTANT,
        permissions: ['reservation.single.manage', 'absence.manage'],
      });
    });

    it('visualizador não tem permissões de escrita', async () => {
      const response = await viewer.get('/api/auth/me').expect(200);
      expect(response.body).toMatchObject({ role: ROLE_VIEWER, permissions: [] });
    });

    it('responde 401 quando o usuário do token não existe mais', async () => {
      const token = await tokenFor(context.app, 999, [ROLE_ADMIN]);
      const response = await authed(context.app, token).get('/api/auth/me').expect(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
    });
  });

  describe('POST /api/role-request', () => {
    it('cria o pedido pendente, registra auditoria e avisa o administrador por e-mail', async () => {
      const response = await requestAccess().expect(201);

      expect(response.body).toMatchObject({
        userId: VIEWER_USER.id,
        userName: VIEWER_USER.name,
        userEmail: VIEWER_USER.email,
        currentRole: ROLE_VIEWER,
        requestedRole: ROLE_ASSISTANT,
        justification: JUSTIFICATION,
        status: ROLE_REQUEST_PENDING,
      });
      expect(response.body.createdAt).toEqual(expect.any(String));

      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: response.body.id,
          userName: VIEWER_USER.name,
          currentRole: ROLE_VIEWER,
          requestedRole: ROLE_ASSISTANT,
        }),
      );

      const audit = await context.db
        .collection(COLLECTIONS.auditEvents)
        .findOne({ action: 'role_request.create' });
      expect(audit).toMatchObject({ entityType: 'role_request', actorUserId: VIEWER_USER.id });
    });

    it('grava o pedido mesmo quando o Resend falha', async () => {
      const mail = context.app.get(MailService) as unknown as {
        env: Record<string, unknown>;
        client: unknown;
      };
      const originalEnv = mail.env;
      const send = vi.fn().mockRejectedValue(new Error('Resend fora do ar'));
      mail.env = { ...originalEnv, RESEND_API_KEY: 're_teste', ADMIN_NOTIFICATION_EMAILS: 'ti@x.com' };
      mail.client = { emails: { send } };
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      try {
        await requestAccess().expect(201);
      } finally {
        mail.env = originalEnv;
        mail.client = null;
      }

      expect(send).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Resend fora do ar'));
      expect(await context.db.collection(COLLECTIONS.roleRequests).countDocuments()).toBe(1);
    });

    it('permite um pedido pendente por vez', async () => {
      await requestAccess().expect(201);

      const response = await requestAccess(viewer, ROLE_COORDINATOR).expect(400);
      expect(response.body.message).toBe(ROLE_REQUEST_MESSAGES.alreadyPending);
    });

    it('exige um perfil acima do atual', async () => {
      const response = await requestAccess(assistant, ROLE_ASSISTANT).expect(400);
      expect(response.body.message).toBe(ROLE_REQUEST_MESSAGES.mustBeAbove);
    });

    it('não aceita pedir o perfil de administrador', async () => {
      await requestAccess(viewer, ROLE_ADMIN as never).expect(400);
    });

    it('recusa pedido do administrador', async () => {
      const response = await requestAccess(admin, ROLE_COORDINATOR).expect(403);
      expect(response.body.message).toBe(ROLE_REQUEST_MESSAGES.adminCannotRequest);
    });

    it('valida o tamanho da justificativa', async () => {
      const response = await viewer
        .post('/api/role-request')
        .send({ requestedRole: ROLE_ASSISTANT, justification: 'curta' })
        .expect(400);
      expect(response.body.message).toContain('pelo menos 10 caracteres');
    });

    it('responde 401 sem token', async () => {
      await request(context.app.getHttpServer()).post('/api/role-request').expect(401);
    });
  });

  describe('GET /api/role-request/me e cancelamento', () => {
    it('lista só os pedidos do próprio usuário, do mais recente para o mais antigo', async () => {
      const first = await requestAccess().expect(201);
      await viewer.post(`/api/role-request/${first.body.id}/cancel`).expect(200);
      await requestAccess(viewer, ROLE_COORDINATOR).expect(201);
      await requestAccess(assistant, ROLE_COORDINATOR).expect(201);

      const response = await viewer.get('/api/role-request/me').expect(200);

      expect(response.body.map((item: { status: string }) => item.status)).toEqual([
        'PENDING',
        'CANCELLED',
      ]);
    });

    it('o dono cancela o pedido pendente', async () => {
      const created = await requestAccess().expect(201);

      const response = await viewer.post(`/api/role-request/${created.body.id}/cancel`).expect(200);

      expect(response.body.status).toBe('CANCELLED');
      await requestAccess().expect(201);
    });

    it('não revela nem cancela pedido de outra pessoa', async () => {
      const created = await requestAccess().expect(201);

      const response = await assistant
        .post(`/api/role-request/${created.body.id}/cancel`)
        .expect(400);
      expect(response.body.message).toBe(ROLE_REQUEST_MESSAGES.notFound);
    });
  });

  describe('análise pelo administrador', () => {
    it('lista pendentes paginados e informa o total para o badge', async () => {
      await requestAccess().expect(201);
      await requestAccess(assistant, ROLE_COORDINATOR).expect(201);

      const list = await admin.get('/api/role-request?status=PENDING&page=0&size=10').expect(200);
      expect(list.body.page.totalElements).toBe(2);
      expect(list.body.content).toHaveLength(2);

      const summary = await admin.get('/api/role-request/summary').expect(200);
      expect(summary.body).toEqual({ pending: 2 });
    });

    it('aprovar promove o usuário, e a promoção vale sem novo login', async () => {
      const created = await requestAccess().expect(201);

      const response = await admin.post(`/api/role-request/${created.body.id}/approve`).expect(200);

      expect(response.body).toMatchObject({ status: 'APPROVED', reviewedBy: 1 });
      expect(await rolesOf(VIEWER_USER.id)).toEqual([ROLE_ASSISTANT]);

      // O mesmo token de antes já enxerga o perfil novo.
      const me = await viewer.get('/api/auth/me').expect(200);
      expect(me.body.role).toBe(ROLE_ASSISTANT);
      expect(me.body.permissions).toContain('reservation.single.manage');
    });

    it('não aprova o mesmo pedido duas vezes', async () => {
      const created = await requestAccess().expect(201);
      await admin.post(`/api/role-request/${created.body.id}/approve`).expect(200);

      const response = await admin
        .post(`/api/role-request/${created.body.id}/approve`)
        .expect(400);
      expect(response.body.message).toBe(ROLE_REQUEST_MESSAGES.alreadyClosed);
    });

    it('não aprova quando o usuário já chegou ao perfil por outro caminho', async () => {
      const created = await requestAccess().expect(201);
      await context.db
        .collection(COLLECTIONS.users)
        .updateOne({ _id: VIEWER_USER.id as never }, { $set: { roles: [ROLE_COORDINATOR] } });

      const response = await admin
        .post(`/api/role-request/${created.body.id}/approve`)
        .expect(400);
      expect(response.body.message).toBe(ROLE_REQUEST_MESSAGES.noLongerAbove);
      expect(await rolesOf(VIEWER_USER.id)).toEqual([ROLE_COORDINATOR]);
    });

    it('recusar mantém o perfil e guarda o motivo', async () => {
      const created = await requestAccess().expect(201);

      const response = await admin
        .post(`/api/role-request/${created.body.id}/reject`)
        .send({ reason: 'Fale com a coordenação primeiro.' })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'REJECTED',
        reviewNote: 'Fale com a coordenação primeiro.',
      });
      expect(await rolesOf(VIEWER_USER.id)).toEqual([ROLE_VIEWER]);
    });

    it('recusar funciona sem corpo', async () => {
      const created = await requestAccess().expect(201);
      const response = await admin.post(`/api/role-request/${created.body.id}/reject`).expect(200);
      expect(response.body.status).toBe('REJECTED');
    });

    it('coordenação não aprova pedidos', async () => {
      const created = await requestAccess().expect(201);
      await coordinator.post(`/api/role-request/${created.body.id}/approve`).expect(403);
      expect(await rolesOf(VIEWER_USER.id)).toEqual([ROLE_VIEWER]);
    });
  });

  describe('PATCH /api/user/:id/role', () => {
    it('altera o perfil, cancela o pedido pendente e registra auditoria', async () => {
      await requestAccess().expect(201);

      const response = await admin
        .patch(`/api/user/${VIEWER_USER.id}/role`)
        .send({ role: ROLE_COORDINATOR })
        .expect(200);

      expect(response.body.roles).toEqual([{ roleId: 3, name: ROLE_COORDINATOR }]);
      expect(response.body).not.toHaveProperty('password');

      const pending = await context.db
        .collection(COLLECTIONS.roleRequests)
        .findOne({ userId: VIEWER_USER.id });
      expect(pending).toMatchObject({ status: 'CANCELLED', reviewNote: DIRECT_CHANGE_NOTE });

      const audit = await context.db
        .collection(COLLECTIONS.auditEvents)
        .findOne({ action: 'user.role_change' });
      expect(audit?.details).toMatchObject({
        perfilAnterior: ROLE_VIEWER,
        perfilNovo: ROLE_COORDINATOR,
      });
    });

    it('também rebaixa', async () => {
      await admin
        .patch(`/api/user/${COORDINATOR_USER.id}/role`)
        .send({ role: ROLE_VIEWER })
        .expect(200);
      expect(await rolesOf(COORDINATOR_USER.id)).toEqual([ROLE_VIEWER]);
    });

    it('normaliza o BASIC legado ao atribuir coordenação', async () => {
      await admin.patch('/api/user/5/role').send({ role: ROLE_COORDINATOR }).expect(200);
      expect(await rolesOf(5)).toEqual([ROLE_COORDINATOR]);
    });

    it('nunca altera o administrador do sistema', async () => {
      const response = await admin
        .patch('/api/user/1/role')
        .send({ role: ROLE_VIEWER })
        .expect(403);
      expect(response.body.message).toBe(ADMIN_ROLE_LOCKED_MESSAGE);
      expect(await rolesOf(1)).toEqual([ROLE_ADMIN]);
    });

    it('nunca atribui o perfil de administrador', async () => {
      await admin.patch(`/api/user/${VIEWER_USER.id}/role`).send({ role: ROLE_ADMIN }).expect(400);
      expect(await rolesOf(VIEWER_USER.id)).toEqual([ROLE_VIEWER]);
    });

    it('rebaixamento vale na hora para o token já emitido', async () => {
      await coordinator.post('/api/section').send({ nome: 'Antes' }).expect(201);

      await admin
        .patch(`/api/user/${COORDINATOR_USER.id}/role`)
        .send({ role: ROLE_VIEWER })
        .expect(200);

      await coordinator.post('/api/section').send({ nome: 'Depois' }).expect(403);
    });
  });

  describe('migração de perfis (db:migrate-roles)', () => {
    it('relata BASIC e o ADMIN único sem alterar nada', async () => {
      const report = await inspectRoleMigration(context.db);

      expect(report.legacyUsers.map((user) => user.id)).toEqual([5]);
      expect(report.admins.map((user) => user.email)).toEqual(['admin@admin.com']);
      expect(report.warnings).toEqual([]);
      expect(await rolesOf(5)).toEqual([ROLE_BASIC]);
    });

    it('converte BASIC em COORDINATOR e é idempotente', async () => {
      expect(await applyRoleMigration(context.db)).toEqual({ converted: 1 });
      expect(await rolesOf(5)).toEqual([ROLE_COORDINATOR]);
      expect(await rolesOf(1)).toEqual([ROLE_ADMIN]);

      expect(await applyRoleMigration(context.db)).toEqual({ converted: 0 });
    });

    it('avisa quando não há exatamente um ADMIN', async () => {
      await context.db
        .collection(COLLECTIONS.users)
        .updateOne({ _id: COORDINATOR_USER.id as never }, { $set: { roles: [ROLE_ADMIN] } });

      const report = await inspectRoleMigration(context.db);
      expect(report.warnings[0]).toContain('encontrados 2');
    });

    it('cria o índice que garante um pedido pendente por usuário', async () => {
      await applyRoleMigration(context.db);
      const indexes = await context.db.collection(COLLECTIONS.roleRequests).indexes();
      expect(indexes.find((index) => index.name === 'uniq_pending_per_user')).toMatchObject({
        unique: true,
        partialFilterExpression: { status: 'PENDING' },
      });
    });
  });
});
