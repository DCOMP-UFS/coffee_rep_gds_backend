import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AssignableRole, ROLE_ADMIN, resolveRole } from '../auth/roles';
import { AuthorizationDeniedError, EntityNotFoundError } from '../common/errors/domain-errors';
import { ROLE_REQUEST_CANCELLED } from '../database/documents';
import { UserResponse, toUserResponse } from '../users/users.mapper';
import { UsersRepository } from '../users/users.repository';
import { RoleRequestsRepository } from './role-requests.repository';

export const ADMIN_ROLE_LOCKED_MESSAGE =
  'O perfil do administrador do sistema não pode ser alterado.';

export const DIRECT_CHANGE_NOTE = 'Perfil alterado diretamente pelo administrador.';

/** Alteração direta de perfil feita pelo administrador na aba Usuários. */
@Injectable()
export class UserRolesService {
  constructor(
    private readonly users: UsersRepository,
    private readonly requests: RoleRequestsRepository,
    private readonly audit: AuditService,
  ) {}

  async changeRole(userId: number, role: AssignableRole, actorId: number): Promise<UserResponse> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new EntityNotFoundError('Usuário não encontrado!');
    }

    const previousRole = resolveRole(user.roles);
    if (previousRole === ROLE_ADMIN) {
      throw new AuthorizationDeniedError(ADMIN_ROLE_LOCKED_MESSAGE);
    }

    // Comparação com o valor gravado: um BASIC legado recebendo COORDINATOR é normalizado.
    const alreadyStored = user.roles.length === 1 && user.roles[0] === role;
    if (alreadyStored) {
      return toUserResponse(user);
    }

    await this.users.updateRoles(userId, [role], actorId);

    // O pedido pendente perde o sentido depois de uma decisão direta do administrador.
    await this.requests.closePendingOfUser(userId, {
      status: ROLE_REQUEST_CANCELLED,
      reviewedBy: actorId,
      reviewNote: DIRECT_CHANGE_NOTE,
    });

    await this.audit.record({
      action: 'user.role_change',
      entityType: 'user',
      entityId: userId,
      actorUserId: actorId,
      details: { usuario: user.name, perfilAnterior: previousRole, perfilNovo: role },
    });

    const updated = await this.users.findById(userId);
    return toUserResponse(updated ?? { ...user, roles: [role] });
  }
}
