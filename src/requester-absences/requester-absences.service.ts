import { Injectable } from '@nestjs/common';
import { formatLocalDate, nowWallClock } from '../common/date/local-date-time';
import { BadParametersError, EntityNotFoundError } from '../common/errors/domain-errors';
import { RequesterAbsenceDocument } from '../database/documents';
import { RequestersRepository } from '../requesters/requesters.repository';
import { CreateRequesterAbsenceDto, RequesterAbsenceResponse } from './dto/requester-absence.dto';
import { RequesterAbsencesRepository } from './requester-absences.repository';

@Injectable()
export class RequesterAbsencesService {
  constructor(
    private readonly repository: RequesterAbsencesRepository,
    private readonly requesters: RequestersRepository,
  ) {}

  /** Nunca paginado: o frontend espera sempre um array puro. */
  async findAll(requesterId: number | null): Promise<RequesterAbsenceResponse[]> {
    const absences = requesterId
      ? await this.repository.findByRequester(requesterId)
      : await this.repository.findAll();

    return this.withRequesterNames(absences);
  }

  async create(dto: CreateRequesterAbsenceDto, userId: number): Promise<RequesterAbsenceResponse> {
    this.validateRange(dto);
    const requester = await this.getRequester(dto.solicitanteId);

    const created = await this.repository.insert({
      requesterId: requester._id,
      startDate: dto.dataInicio,
      endDate: dto.dataFim,
      createdAt: nowWallClock(),
      updatedAt: null,
      updatedBy: userId,
    });

    return toResponse(created, requester.name);
  }

  async update(
    id: number,
    dto: CreateRequesterAbsenceDto,
    userId: number,
  ): Promise<RequesterAbsenceResponse> {
    this.validateRange(dto);

    if (!(await this.repository.findById(id))) {
      throw new EntityNotFoundError(`Ausência não encontrada: ${id}`);
    }

    const requester = await this.getRequester(dto.solicitanteId);

    const saved = await this.repository.update(id, {
      requesterId: requester._id,
      startDate: dto.dataInicio,
      endDate: dto.dataFim,
      updatedAt: nowWallClock(),
      updatedBy: userId,
    });

    return toResponse(saved, requester.name);
  }

  /** Exclusão definitiva, diferente do soft delete dos demais cadastros. */
  async remove(id: number): Promise<void> {
    if (!(await this.repository.deleteById(id))) {
      throw new EntityNotFoundError(`Ausência não encontrada: ${id}`);
    }
  }

  private validateRange(dto: CreateRequesterAbsenceDto): void {
    if (dto.dataInicio.getTime() > dto.dataFim.getTime()) {
      throw new BadParametersError('A data de início não pode ser posterior à data de fim.');
    }
  }

  private async getRequester(id: number) {
    const requester = await this.requesters.findById(id);
    if (!requester) {
      throw new EntityNotFoundError('Solicitante não encontrado');
    }
    return requester;
  }

  /** Resolve os nomes em lote, evitando uma consulta por ausência. */
  private async withRequesterNames(
    absences: RequesterAbsenceDocument[],
  ): Promise<RequesterAbsenceResponse[]> {
    if (absences.length === 0) return [];

    const requesters = await this.requesters.findByIds([
      ...new Set(absences.map((absence) => absence.requesterId)),
    ]);
    const namesById = new Map(requesters.map((requester) => [requester._id, requester.name]));

    return absences.map((absence) => toResponse(absence, namesById.get(absence.requesterId) ?? ''));
  }
}

function toResponse(
  absence: RequesterAbsenceDocument,
  requesterName: string,
): RequesterAbsenceResponse {
  return {
    id: absence._id,
    solicitanteId: absence.requesterId,
    solicitanteNome: requesterName,
    dataInicio: formatLocalDate(absence.startDate),
    dataFim: formatLocalDate(absence.endDate),
  };
}
