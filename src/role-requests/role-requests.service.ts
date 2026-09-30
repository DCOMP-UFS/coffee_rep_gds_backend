import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../auth/current-user';
import { ROLE_ADMIN, Role, isRoleAbove, resolveRole } from '../auth/roles';
import { nowWallClock } from '../common/date/local-date-time';
import {
  AuthorizationDeniedError,
  EntityAlreadyExistsError,
  EntityNotFoundError,
  ValidationError,
} from '../common/errors/domain-errors';
import { PageEnvelope, toPage } from '../common/pagination/page';
import { Pageable } from '../common/pagination/pageable';
import {
  ROLE_REQUEST_APPROVED,
  ROLE_REQUEST_CANCELLED,
  ROLE_REQUEST_PENDING,
  ROLE_REQUEST_REJECTED,
  RoleRequestDocument,
  RoleRequestStatus,
} from '../database/documents';
import { MailService } from '../mail/mail.service';
import { UsersRepository } from '../users/users.repository';
import {
  CreateRoleRequestDto,
  RoleRequestResponse,
  RoleRequestSummaryResponse,
} from './dto/role-request.dto';
import { toRoleRequestResponse } from './role-requests.mapper';
import { RoleRequestReview, RoleRequestsRepository, isDuplicateKeyError } from './role-requests.repository';

export const ROLE_REQUEST_MESSAGES = {
  notFound: 'Pedido não encontrado!',
  adminCannotRequest: 'O administrador de tecnologia já tem acesso total e não precisa fazer pedidos.',
  mustBeAbove: 'Escolha um perfil acima do seu perfil atual.',
  alreadyPending:
    'Você já tem um pedido pendente. Aguarde a análise ou cancele o pedido atual antes de fazer outro.',
  alreadyClosed: 'Este pedido já foi analisado ou cancelado.',
  userNotFound: 'O usuário deste pedido não existe mais.',
  noLongerAbove:
    'O usuário já tem este perfil ou um perfil superior. Recuse o pedido para encerrá-lo.',
} as const;

@Injectable()
export class RoleRequestsService {
  constructor(
    private readonly repository: RoleRequestsRepository,
    private readonly users: UsersRepository,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateRoleRequestDto, actor: Actor): Promise<RoleRequestResponse> {
    if (actor.role === ROLE_ADMIN) {
      throw new AuthorizationDeniedError(ROLE_REQUEST_MESSAGES.adminCannotRequest);
    }
    if (!isRoleAbove(dto.requestedRole, actor.role)) {
      throw new ValidationError(ROLE_REQUEST_MESSAGES.mustBeAbove);
    }
    if (await this.repository.findPendingByUserId(actor.userId)) {
      throw new EntityAlreadyExistsError(ROLE_REQUEST_MESSAGES.alreadyPending);
    }

    const user = await this.users.findById(actor.userId);
    const created = await this.insertPending({
      userId: actor.userId,
      userName: user?.name?.trim() || 'Usuário sem nome',
      userEmail: user?.email ?? null,
      currentRole: actor.role,
      requestedRole: dto.requestedRole,
      justification: dto.justification,
      status: ROLE_REQUEST_PENDING,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: nowWallClock(),
    });

    await this.audit.record({
      action: 'role_request.create',
      entityType: 'role_request',
      entityId: created._id,
      actorUserId: actor.userId,
      details: { perfilAtual: actor.role, perfilPedido: dto.requestedRole },
    });

    await this.mail.notifyNewRoleRequest({
      requestId: created._id,
      userName: created.userName,
      userEmail: created.userEmail,
      currentRole: actor.role,
      requestedRole: dto.requestedRole,
      justification: created.justification,
      createdAt: created.createdAt,
    });

    return toRoleRequestResponse(created);
  }

  async findMine(userId: number): Promise<RoleRequestResponse[]> {
    const requests = await this.repository.findByUserId(userId);
    return requests.map(toRoleRequestResponse);
  }

  async findPaged(
    status: RoleRequestStatus | undefined,
    pageable: Pageable,
  ): Promise<PageEnvelope<RoleRequestResponse>> {
    const { items, total } = await this.repository.findPaged(status, pageable);
    return toPage(items.map(toRoleRequestResponse), pageable, total);
  }

  async summary(): Promise<RoleRequestSummaryResponse> {
    return { pending: await this.repository.countPending() };
  }

  async cancel(id: number, actor: Actor): Promise<RoleRequestResponse> {
    const request = await this.repository.findById(id);
    // Pedido de outra pessoa responde como inexistente, para não revelar ids alheios.
    if (!request || request.userId !== actor.userId) {
      throw new EntityNotFoundError(ROLE_REQUEST_MESSAGES.notFound);
    }

    const closed = await this.close(request, {
      status: ROLE_REQUEST_CANCELLED,
      reviewedBy: null,
      reviewNote: null,
    });

    await this.audit.record({
      action: 'role_request.cancel',
      entityType: 'role_request',
      entityId: id,
      actorUserId: actor.userId,
      details: { perfilPedido: request.requestedRole },
    });

    return toRoleRequestResponse(closed);
  }

  /**
   * O pedido é encerrado antes de o perfil mudar: o `closePending` condicional impede que
   * duas aprovações simultâneas apliquem a mudança duas vezes.
   */
  async approve(id: number, reviewerId: number): Promise<RoleRequestResponse> {
    const request = await this.getPending(id);

    const user = await this.users.findById(request.userId);
    if (!user) {
      throw new EntityNotFoundError(ROLE_REQUEST_MESSAGES.userNotFound);
    }

    const currentRole = resolveRole(user.roles);
    const requestedRole = request.requestedRole as Role;
    if (!isRoleAbove(requestedRole, currentRole)) {
      throw new ValidationError(ROLE_REQUEST_MESSAGES.noLongerAbove);
    }

    const closed = await this.close(request, {
      status: ROLE_REQUEST_APPROVED,
      reviewedBy: reviewerId,
      reviewNote: null,
    });
    await this.users.updateRoles(request.userId, [requestedRole], reviewerId);

    await this.audit.record({
      action: 'role_request.approve',
      entityType: 'role_request',
      entityId: id,
      actorUserId: reviewerId,
      details: { usuario: request.userName, perfilAnterior: currentRole, perfilNovo: requestedRole },
    });

    return toRoleRequestResponse(closed);
  }

  async reject(id: number, reviewerId: number, reason: string | null): Promise<RoleRequestResponse> {
    const request = await this.getPending(id);

    const closed = await this.close(request, {
      status: ROLE_REQUEST_REJECTED,
      reviewedBy: reviewerId,
      reviewNote: reason,
    });

    await this.audit.record({
      action: 'role_request.reject',
      entityType: 'role_request',
      entityId: id,
      actorUserId: reviewerId,
      details: {
        usuario: request.userName,
        perfilPedido: request.requestedRole,
        ...(reason ? { motivo: reason } : {}),
      },
    });

    return toRoleRequestResponse(closed);
  }

  private async getPending(id: number): Promise<RoleRequestDocument> {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new EntityNotFoundError(ROLE_REQUEST_MESSAGES.notFound);
    }
    if (request.status !== ROLE_REQUEST_PENDING) {
      throw new ValidationError(ROLE_REQUEST_MESSAGES.alreadyClosed);
    }
    return request;
  }

  private async close(
    request: RoleRequestDocument,
    review: RoleRequestReview,
  ): Promise<RoleRequestDocument> {
    const closed = await this.repository.closePending(request._id, review);
    if (!closed) {
      throw new ValidationError(ROLE_REQUEST_MESSAGES.alreadyClosed);
    }
    return closed;
  }

  /** O índice único parcial cobre a corrida entre a verificação e a gravação. */
  private async insertPending(
    request: Omit<RoleRequestDocument, '_id'>,
  ): Promise<RoleRequestDocument> {
    try {
      return await this.repository.insert(request);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new EntityAlreadyExistsError(ROLE_REQUEST_MESSAGES.alreadyPending);
      }
      throw error;
    }
  }
}
