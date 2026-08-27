import { Injectable } from '@nestjs/common';
import { nowWallClock } from '../common/date/local-date-time';
import { EntityNotFoundError } from '../common/errors/domain-errors';
import { PageEnvelope, toPage } from '../common/pagination/page';
import { Pageable } from '../common/pagination/pageable';
import { blankToNull, isBlank } from '../common/validation/text';
import { RequesterDocument, STATUS_ACTIVE, STATUS_INACTIVE } from '../database/documents';
import {
  CreateRequesterDto,
  CreateRequesterResponse,
  RequesterResponse,
  UpdateRequesterDto,
} from './dto/requester.dto';
import { RequestersRepository } from './requesters.repository';

@Injectable()
export class RequestersService {
  constructor(private readonly repository: RequestersRepository) {}

  async findActivePaged(
    search: string | null | undefined,
    pageable: Pageable,
  ): Promise<PageEnvelope<RequesterResponse>> {
    const { items, total } = await this.repository.findActive(search, pageable);
    return toPage(items.map(toRequesterResponse), pageable, total);
  }

  async findActiveUnpaged(search: string | null | undefined): Promise<RequesterResponse[]> {
    const { items } = await this.repository.findActive(search, null);
    return items.map(toRequesterResponse);
  }

  /** Mensagem sem "!", como o `RequesterService.getRequesterById` do Java. */
  async findById(id: number): Promise<RequesterResponse> {
    const requester = await this.repository.findById(id);
    if (!requester) {
      throw new EntityNotFoundError('Solicitante não encontrado');
    }
    return toRequesterResponse(requester);
  }

  /**
   * Usado na criação de reserva e de ausência. Como no Java, **não** filtra por status:
   * um solicitante inativo ainda pode receber reservas. Ver docs/BUGS-HERDADOS.md.
   */
  async getById(id: number): Promise<RequesterDocument> {
    const requester = await this.repository.findById(id);
    if (!requester) {
      throw new EntityNotFoundError('Solicitante não encontrado');
    }
    return requester;
  }

  async create(dto: CreateRequesterDto, userId: number): Promise<CreateRequesterResponse> {
    const created = await this.repository.insert({
      name: dto.nome,
      contactNumber: blankToNull(dto.telefone),
      specialty: dto.especialidade,
      status: STATUS_ACTIVE,
      createdAt: nowWallClock(),
      updatedAt: null,
      updatedBy: userId,
    });

    return toCreateRequesterResponse(created);
  }

  /**
   * `nome` e `especialidade` só mudam quando vêm preenchidos, mas `telefone` é sempre
   * sobrescrito — inclusive apagado quando vem vazio. Comportamento do Java preservado.
   */
  async update(
    id: number,
    dto: UpdateRequesterDto,
    userId: number,
  ): Promise<CreateRequesterResponse> {
    const requester = await this.repository.findById(id);
    if (!requester) {
      throw new EntityNotFoundError('Solicitante não encontrado!');
    }

    const changes: Partial<RequesterDocument> = {
      contactNumber: blankToNull(dto.telefone),
      updatedAt: nowWallClock(),
      updatedBy: userId,
    };

    if (!isBlank(dto.nome)) changes.name = dto.nome!;
    if (!isBlank(dto.especialidade)) changes.specialty = dto.especialidade!;

    return toCreateRequesterResponse(await this.repository.update(id, changes));
  }

  async remove(id: number, userId: number): Promise<void> {
    const requester = await this.repository.findById(id);
    if (!requester) {
      throw new EntityNotFoundError('Solicitante não encontrado!');
    }

    await this.repository.update(id, {
      status: STATUS_INACTIVE,
      updatedAt: nowWallClock(),
      updatedBy: userId,
    });
  }
}

function toRequesterResponse(requester: RequesterDocument): RequesterResponse {
  return {
    id: requester._id,
    nome: requester.name,
    contato: requester.contactNumber,
    especialidade: requester.specialty,
  };
}

function toCreateRequesterResponse(requester: RequesterDocument): CreateRequesterResponse {
  return {
    id: requester._id,
    nome: requester.name,
    telefone: requester.contactNumber,
    especialidade: requester.specialty,
  };
}
