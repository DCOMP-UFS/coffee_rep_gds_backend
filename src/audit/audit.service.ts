import { Injectable, Logger } from '@nestjs/common';
import { formatLocalDateTime, nowWallClock, parseLocalDate } from '../common/date/local-date-time';
import { PageEnvelope, toPage } from '../common/pagination/page';
import { Pageable } from '../common/pagination/pageable';
import { UsersRepository } from '../users/users.repository';
import { AuditRepository, AuditListFilters } from './audit.repository';
import { AuditEventResponse } from './dto/audit.dto';
import { RecordAuditInput, UNKNOWN_ACTOR_NAME } from './audit.types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly repository: AuditRepository,
    private readonly users: UsersRepository,
  ) {}

  /**
   * Grava um evento de auditoria. Falhas são engolidas para nunca quebrar a
   * operação de negócio que disparou o registro.
   */
  async record(input: RecordAuditInput): Promise<void> {
    try {
      const actorName =
        input.actorName ?? (await this.resolveActorName(input.actorUserId));

      await this.repository.insert({
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorUserId: input.actorUserId,
        actorName,
        details: input.details ?? {},
        createdAt: input.createdAt ?? nowWallClock(),
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao gravar auditoria (${input.action}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async findPaged(
    query: Record<string, string | undefined>,
    pageable: Pageable,
  ): Promise<PageEnvelope<AuditEventResponse>> {
    const filters = this.parseFilters(query);
    const { items, total } = await this.repository.findPaged(filters, pageable);
    return toPage(items.map(toResponse), pageable, total);
  }

  async findUnpaged(query: Record<string, string | undefined>): Promise<AuditEventResponse[]> {
    const items = await this.repository.findUnpaged(this.parseFilters(query));
    return items.map(toResponse);
  }

  /** Exposto para o script de backfill verificar idempotência. */
  existsBackfill(source: string, sourceId: number, action: string): Promise<boolean> {
    return this.repository.existsBackfill(source, sourceId, action);
  }

  private async resolveActorName(actorUserId: number | null): Promise<string> {
    if (actorUserId == null) {
      return UNKNOWN_ACTOR_NAME;
    }
    const user = await this.users.findById(actorUserId);
    return user?.name?.trim() || UNKNOWN_ACTOR_NAME;
  }

  private parseFilters(query: Record<string, string | undefined>): AuditListFilters {
    const createdFrom = query.createdFrom ? parseLocalDate(query.createdFrom) : null;
    let createdTo = query.createdTo ? parseLocalDate(query.createdTo) : null;
    if (createdTo) {
      createdTo = new Date(
        Date.UTC(
          createdTo.getUTCFullYear(),
          createdTo.getUTCMonth(),
          createdTo.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );
    }

    return {
      q: query.q ?? null,
      action: query.action ?? null,
      entityType: query.entityType ?? null,
      createdFrom,
      createdTo,
    };
  }
}

function toResponse(event: {
  _id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  actorUserId: number | null;
  actorName: string;
  details: Record<string, unknown>;
  createdAt: Date;
}): AuditEventResponse {
  return {
    id: event._id,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    actorUserId: event.actorUserId,
    actorName: event.actorName,
    details: event.details ?? {},
    createdAt: formatLocalDateTime(event.createdAt),
  };
}
