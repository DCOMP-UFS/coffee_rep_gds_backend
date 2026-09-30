import { describe, expect, it, vi } from 'vitest';
import { ROLE_ASSISTANT, ROLE_VIEWER } from '../auth/roles';
import { ValidationError } from '../common/errors/domain-errors';
import { ROLE_REQUEST_PENDING, RoleRequestDocument } from '../database/documents';
import { ROLE_REQUEST_MESSAGES, RoleRequestsService } from './role-requests.service';

const pending: RoleRequestDocument = {
  _id: 1,
  userId: 10,
  userName: 'Vera',
  userEmail: 'vera@teste.com',
  currentRole: ROLE_VIEWER,
  requestedRole: ROLE_ASSISTANT,
  justification: 'Preciso reservar salas.',
  status: ROLE_REQUEST_PENDING,
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  createdAt: new Date('2026-09-29T10:00:00Z'),
};

function setup() {
  const repository = {
    findById: vi.fn().mockResolvedValue(pending),
    // Outra aprovação chegou antes: o encerramento condicional não encontra mais o pendente.
    closePending: vi.fn().mockResolvedValue(null),
  };
  const users = {
    findById: vi.fn().mockResolvedValue({ _id: 10, name: 'Vera', roles: [ROLE_VIEWER] }),
    updateRoles: vi.fn(),
  };
  const audit = { record: vi.fn() };
  const mail = { notifyNewRoleRequest: vi.fn() };
  const service = new RoleRequestsService(
    repository as never,
    users as never,
    audit as never,
    mail as never,
  );
  return { service, users, audit };
}

describe('RoleRequestsService (concorrência)', () => {
  it('não muda o perfil quando outra requisição já encerrou o pedido', async () => {
    const { service, users, audit } = setup();

    await expect(service.approve(1, 1)).rejects.toThrow(
      new ValidationError(ROLE_REQUEST_MESSAGES.alreadyClosed),
    );

    expect(users.updateRoles).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('não registra recusa quando outra requisição já encerrou o pedido', async () => {
    const { service, audit } = setup();

    await expect(service.reject(1, 1, null)).rejects.toThrow(ValidationError);

    expect(audit.record).not.toHaveBeenCalled();
  });
});
