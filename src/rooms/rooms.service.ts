import { Injectable } from '@nestjs/common';
import { nowWallClock } from '../common/date/local-date-time';
import { EntityAlreadyExistsError, EntityNotFoundError } from '../common/errors/domain-errors';
import { PageEnvelope, toPage } from '../common/pagination/page';
import { Pageable } from '../common/pagination/pageable';
import {
  STATUS_ACTIVE,
  STATUS_INACTIVE,
  RoomDocument,
  SectionDocument,
} from '../database/documents';
import { SectionsRepository } from '../sections/sections.repository';
import { CreateRoomDto, CreateRoomResponse, RoomResponse, UpdateRoomDto } from './dto/room.dto';
import { RoomFilters, RoomWithOccupation, RoomsRepository } from './rooms.repository';

/**
 * A dependência é sobre `SectionsRepository`, e não sobre `SectionsService`, de propósito:
 * setores e salas se referenciam nos dois sentidos (a sala valida o setor, o setor
 * cascateia para as salas) e depender dos serviços criaria um ciclo de importação em que
 * uma das classes chega `undefined` em tempo de execução.
 */
@Injectable()
export class RoomsService {
  constructor(
    private readonly repository: RoomsRepository,
    private readonly sections: SectionsRepository,
  ) {}

  async findPaged(filters: RoomFilters, pageable: Pageable): Promise<PageEnvelope<RoomResponse>> {
    const { items, total } = await this.repository.findWithOccupation(filters, pageable);
    return toPage(items.map(toRoomResponse), pageable, total);
  }

  async findUnpaged(filters: RoomFilters): Promise<RoomResponse[]> {
    const { items } = await this.repository.findWithOccupation(filters, null);
    return items.map(toRoomResponse);
  }

  async findById(id: number): Promise<RoomResponse> {
    const room = await this.repository.findActiveWithOccupationById(id);
    if (!room) {
      throw new EntityNotFoundError('Sala não encontrada!');
    }
    return toRoomResponse(room);
  }

  /** Sala inativa é indistinguível de inexistente, como no `RoomDomainService` do Java. */
  async getActiveById(id: number): Promise<RoomDocument> {
    const room = await this.repository.findActiveById(id);
    if (!room) {
      throw new EntityNotFoundError('Sala não encontrada!');
    }
    return room;
  }

  /** Mensagem sem "!", como o `SectionDomainService` do Java. */
  private async getActiveSection(id: number): Promise<SectionDocument> {
    const section = await this.sections.findActiveById(id);
    if (!section) {
      throw new EntityNotFoundError('Setor não encontrado');
    }
    return section;
  }

  async create(dto: CreateRoomDto, userId: number): Promise<CreateRoomResponse> {
    const section = await this.getActiveSection(dto.setorId);
    const existing = await this.repository.findByNameAndSection(dto.nome, section._id);

    if (existing) {
      if (existing.status !== STATUS_INACTIVE) {
        throw new EntityAlreadyExistsError('Já existe uma sala com este nome!');
      }

      // Como no Java, a reativação não registra `updatedBy`.
      const reactivated = await this.repository.update(existing._id, {
        status: STATUS_ACTIVE,
        updatedAt: nowWallClock(),
      });
      return { id: reactivated._id, nome: reactivated.name, setor: section.name };
    }

    const created = await this.repository.insert({
      name: dto.nome,
      status: STATUS_ACTIVE,
      sectionId: section._id,
      createdAt: nowWallClock(),
      updatedAt: null,
      updatedBy: userId,
    });

    return { id: created._id, nome: created.name, setor: section.name };
  }

  /**
   * Assim como no Java, a atualização **não** valida nome duplicado dentro do setor —
   * é possível criar homônimas renomeando ou movendo uma sala. Ver docs/BUGS-HERDADOS.md.
   */
  async update(id: number, dto: UpdateRoomDto, userId: number): Promise<CreateRoomResponse> {
    const room = await this.repository.findActiveById(id);
    if (!room) {
      throw new EntityNotFoundError('Sala não encontrada!');
    }

    const targetSectionId = dto.setorId ?? room.sectionId;
    const section = await this.getActiveSection(targetSectionId);

    const changes: Partial<RoomDocument> = {
      sectionId: section._id,
      updatedAt: nowWallClock(),
      updatedBy: userId,
    };
    if (dto.nome !== null && dto.nome !== undefined) {
      changes.name = dto.nome;
    }

    const saved = await this.repository.update(id, changes);
    return { id: saved._id, nome: saved.name, setor: section.name };
  }

  async remove(id: number, userId: number): Promise<void> {
    const room = await this.repository.findActiveById(id);
    if (!room) {
      throw new EntityNotFoundError('Sala não encontrada!');
    }

    await this.repository.update(id, {
      status: STATUS_INACTIVE,
      updatedAt: nowWallClock(),
      updatedBy: userId,
    });
  }
}

function toRoomResponse(room: RoomWithOccupation): RoomResponse {
  return {
    id: room._id,
    nome: room.name,
    setor: room.sectionName,
    setorId: room.sectionId,
    ocupada: room.occupied,
  };
}
