import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { nowWallClock } from '../common/date/local-date-time';
import { EntityAlreadyExistsError, EntityNotFoundError } from '../common/errors/domain-errors';
import { PageEnvelope, toPage } from '../common/pagination/page';
import { Pageable } from '../common/pagination/pageable';
import { blankToNull, isBlank } from '../common/validation/text';
import { STATUS_ACTIVE, STATUS_INACTIVE, SectionDocument } from '../database/documents';
import { RoomsRepository } from '../rooms/rooms.repository';
import {
  CreateSectionDto,
  CreateSectionResponse,
  SectionResponse,
  UpdateSectionDto,
} from './dto/section.dto';
import { SectionsRepository } from './sections.repository';

@Injectable()
export class SectionsService {
  constructor(
    private readonly repository: SectionsRepository,
    private readonly rooms: RoomsRepository,
    private readonly audit: AuditService,
  ) {}

  async findActivePaged(
    name: string | null | undefined,
    pageable: Pageable,
  ): Promise<PageEnvelope<SectionResponse>> {
    const { items, total } = await this.repository.findActive(name, pageable);
    return toPage(items.map(toSectionResponse), pageable, total);
  }

  async findActiveUnpaged(name: string | null | undefined): Promise<SectionResponse[]> {
    const { items } = await this.repository.findActive(name, null);
    return items.map(toSectionResponse);
  }

  /**
   * Nome duplicado com registro **inativo** reativa o setor existente, preservando o id,
   * em vez de criar outro. Comportamento herdado do Java e visível para o usuário.
   */
  async create(dto: CreateSectionDto, userId: number): Promise<CreateSectionResponse> {
    const existing = await this.repository.findByName(dto.nome);

    if (existing) {
      if (existing.status !== STATUS_INACTIVE) {
        throw new EntityAlreadyExistsError('Já existe um setor com esse nome!');
      }

      const reactivated = await this.repository.update(existing._id, {
        status: STATUS_ACTIVE,
        updatedAt: nowWallClock(),
        updatedBy: userId,
      });
      await this.audit.record({
        action: 'section.create',
        entityType: 'section',
        entityId: reactivated._id,
        actorUserId: userId,
        details: { nome: reactivated.name, reativado: true },
      });
      return toCreateSectionResponse(reactivated);
    }

    const created = await this.repository.insert({
      name: dto.nome,
      observations: blankToNull(dto.observacao),
      status: STATUS_ACTIVE,
      createdAt: nowWallClock(),
      updatedAt: null,
      updatedBy: userId,
    });

    await this.audit.record({
      action: 'section.create',
      entityType: 'section',
      entityId: created._id,
      actorUserId: userId,
      details: { nome: created.name },
    });

    return toCreateSectionResponse(created);
  }

  async update(
    id: number,
    dto: UpdateSectionDto,
    userId: number,
  ): Promise<CreateSectionResponse> {
    const section = await this.repository.findActiveById(id);
    if (!section) {
      throw new EntityNotFoundError('Setor não encontrado!');
    }

    // O Java compara strings e nunca dispara; aqui a comparação é por id, que é o que a
    // regra pretendia. Ver docs/BUGS-HERDADOS.md.
    if (!isBlank(dto.nome)) {
      const conflict = await this.repository.findActiveByNameExcluding(dto.nome!, id);
      if (conflict) {
        throw new EntityAlreadyExistsError('Já existe um setor com esse nome!');
      }
    }

    const changes: Partial<SectionDocument> = {
      status: STATUS_ACTIVE,
      updatedAt: nowWallClock(),
      updatedBy: userId,
    };

    if (!isBlank(dto.nome)) changes.name = dto.nome!.trim();
    if (dto.observacao !== null && dto.observacao !== undefined) {
      changes.observations = blankToNull(dto.observacao);
    }

    const updated = await this.repository.update(id, changes);
    await this.audit.record({
      action: 'section.update',
      entityType: 'section',
      entityId: updated._id,
      actorUserId: userId,
      details: { nome: updated.name },
    });
    return toCreateSectionResponse(updated);
  }

  /**
   * Soft delete com cascata para as salas do setor, como o `CascadeType.ALL` do Java.
   * A cascata não alcança reservas: reservas de salas inativadas continuam listadas.
   */
  async remove(id: number, userId: number): Promise<void> {
    const section = await this.repository.findActiveById(id);
    if (!section) {
      throw new EntityNotFoundError('Setor não encontrado!');
    }

    const now = nowWallClock();
    await this.repository.update(id, {
      status: STATUS_INACTIVE,
      updatedAt: now,
      updatedBy: userId,
    });
    await this.rooms.deactivateBySection(id, userId, now);
    await this.audit.record({
      action: 'section.delete',
      entityType: 'section',
      entityId: id,
      actorUserId: userId,
      details: { nome: section.name },
    });
  }
}

function toSectionResponse(section: SectionDocument): SectionResponse {
  return { id: section._id, nome: section.name, observacoes: section.observations };
}

function toCreateSectionResponse(section: SectionDocument): CreateSectionResponse {
  return { id: section._id, nome: section.name, observacao: section.observations };
}
