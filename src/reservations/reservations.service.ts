import { Injectable } from '@nestjs/common';
import {
  formatLocalDateTime,
  nowWallClock,
  startOfUtcDay,
} from '../common/date/local-date-time';
import {
  BadParametersError,
  EntityAlreadyExistsError,
  EntityNotFoundError,
} from '../common/errors/domain-errors';
import { PageEnvelope, toPage } from '../common/pagination/page';
import { Pageable } from '../common/pagination/pageable';
import { blankToNull } from '../common/validation/text';
import { RESERVATION_APPROVED, ReservationDocument } from '../database/documents';
import { RequesterAbsencesRepository } from '../requester-absences/requester-absences.repository';
import { RequestersService } from '../requesters/requesters.service';
import { RoomsService } from '../rooms/rooms.service';
import {
  CreateReservationDto,
  CreateReservationResponse,
  ReservationResponse,
} from './dto/reservation.dto';
import { OccurrenceSlot, buildOccurrenceSlots } from './recurrence';
import { ReservationFilters, ReservationView, ReservationsRepository } from './reservations.repository';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly repository: ReservationsRepository,
    private readonly absences: RequesterAbsencesRepository,
    private readonly rooms: RoomsService,
    private readonly requesters: RequestersService,
  ) {}

  async findPaged(
    filters: ReservationFilters,
    pageable: Pageable,
  ): Promise<PageEnvelope<ReservationResponse>> {
    this.validateRange(filters.start, filters.end);

    const { items, total } = await this.repository.find(filters, pageable);
    return toPage(await this.toResponses(items), pageable, total);
  }

  /** Alimenta o calendário do frontend; nunca é paginado. */
  async findCurrentMonth(
    sectionId: number | null,
    sectionName: string | null,
  ): Promise<ReservationResponse[]> {
    const now = nowWallClock();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );

    const { items } = await this.repository.find({ start, end, sectionId, sectionName }, null);
    return this.toResponses(items);
  }

  async create(dto: CreateReservationDto, userId: number): Promise<CreateReservationResponse> {
    const room = await this.rooms.getActiveById(dto.salaId);
    const requester = await this.requesters.getById(dto.solicitanteId);

    this.validateRange(dto.horaInicio, dto.horaFim);

    if (!dto.fixo) {
      return this.createSingle(dto, room.name, requester.name, userId);
    }

    return this.createRecurrent(dto, room.name, requester.name, userId);
  }

  async cancel(id: number): Promise<void> {
    if (!(await this.repository.findApprovedById(id))) {
      throw new EntityNotFoundError(`Nenhuma reserva ativa encontrada para este ID: ${id}`);
    }
    await this.repository.cancelById(id);
  }

  /** Cancela a série inteira, incluindo ocorrências já passadas. */
  async cancelRecurrence(recurrenceId: number): Promise<void> {
    if (!(await this.repository.hasApprovedInRecurrence(recurrenceId))) {
      throw new EntityNotFoundError(
        `Nenhuma reserva ativa encontrada para este ID: ${recurrenceId}`,
      );
    }
    await this.repository.cancelByRecurrenceId(recurrenceId);
  }

  private async createSingle(
    dto: CreateReservationDto,
    roomName: string,
    requesterName: string,
    userId: number,
  ): Promise<CreateReservationResponse> {
    await this.assertNoOverlap(dto.salaId, dto.horaInicio, dto.horaFim);

    const [created] = await this.repository.insertMany([
      this.buildDocument(dto, null, { start: dto.horaInicio, end: dto.horaFim }, userId),
    ]);

    return {
      id: created._id,
      startDate: formatLocalDateTime(created.startDate),
      endDate: formatLocalDateTime(created.endDate),
      requesterName,
      roomName,
      recurrenceId: null,
    };
  }

  /**
   * Toda a série é validada antes de qualquer gravação: um único conflito aborta a
   * criação inteira, como no Java.
   */
  private async createRecurrent(
    dto: CreateReservationDto,
    roomName: string,
    requesterName: string,
    userId: number,
  ): Promise<CreateReservationResponse> {
    const slots = buildOccurrenceSlots(dto.horaInicio, dto.horaFim, dto.dias ?? []);

    for (const slot of slots) {
      await this.assertNoOverlap(dto.salaId, slot.start, slot.end);
    }

    if (slots.length === 0) {
      throw new BadParametersError('Nenhuma reserva foi criada!');
    }

    const recurrenceId = await this.repository.nextRecurrenceId();
    await this.repository.insertMany(
      slots.map((slot) => this.buildDocument(dto, recurrenceId, slot, userId)),
    );

    // Os nulos somem da resposta: o frontend recebe só os três campos preenchidos.
    return {
      id: null,
      startDate: null,
      endDate: null,
      requesterName,
      roomName,
      recurrenceId,
    };
  }

  private buildDocument(
    dto: CreateReservationDto,
    recurrenceId: number | null,
    slot: OccurrenceSlot,
    userId: number,
  ): Omit<ReservationDocument, '_id'> {
    return {
      startDate: slot.start,
      endDate: slot.end,
      observations: blankToNull(dto.observacoes),
      roomId: dto.salaId,
      requesterId: dto.solicitanteId,
      status: RESERVATION_APPROVED,
      recurrenceId,
      createdAt: nowWallClock(),
      updatedAt: null,
      // Em reservas, `updatedBy` guarda o criador; é o que a coluna "criador" exibe.
      updatedBy: userId,
    };
  }

  private async assertNoOverlap(roomId: number, start: Date, end: Date): Promise<void> {
    if (await this.repository.hasOverlap(roomId, start, end)) {
      throw new EntityAlreadyExistsError(
        'Já existe uma reserva para esta sala no horário solicitado!',
      );
    }
  }

  private validateRange(start: Date | null, end: Date | null): void {
    if (start && end && start.getTime() > end.getTime()) {
      throw new BadParametersError('A hora de início não pode ser maior que a hora fim da reserva.');
    }
  }

  /**
   * `profissionalAusente` é um N+1 no Java (uma consulta por reserva). Aqui as ausências
   * de todos os solicitantes da página são buscadas de uma vez, agrupadas por dia.
   */
  private async toResponses(reservations: ReservationView[]): Promise<ReservationResponse[]> {
    if (reservations.length === 0) return [];

    const requesterIds = [...new Set(reservations.map((item) => item.requesterId))];
    const days = reservations.map((item) => startOfUtcDay(item.startDate));
    const range = {
      from: new Date(Math.min(...days.map((day) => day.getTime()))),
      to: new Date(Math.max(...days.map((day) => day.getTime()))),
    };

    const absences = await this.absences.findOverlapping(requesterIds, range.from, range.to);

    const isAbsent = (requesterId: number, startDate: Date): boolean => {
      const day = startOfUtcDay(startDate).getTime();
      return absences.some(
        (absence) =>
          absence.requesterId === requesterId &&
          absence.startDate.getTime() <= day &&
          absence.endDate.getTime() >= day,
      );
    };

    return reservations.map((reservation) => ({
      reservationId: reservation._id,
      horaInicio: formatLocalDateTime(reservation.startDate),
      horaFim: formatLocalDateTime(reservation.endDate),
      sala: reservation.roomName,
      solicitante: reservation.requesterName,
      setor: reservation.sectionName,
      criador: reservation.createdByName,
      salaId: reservation.roomId,
      solicitanteId: reservation.requesterId,
      setorId: reservation.sectionId,
      recorrenciaId: reservation.recurrenceId,
      profissionalAusente: isAbsent(reservation.requesterId, reservation.startDate),
    }));
  }
}
