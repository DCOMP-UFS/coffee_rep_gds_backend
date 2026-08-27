import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user';
import { requireLocalDateTime } from '../common/date/local-date-time';
import { ValidationError } from '../common/errors/domain-errors';
import { PageEnvelope } from '../common/pagination/page';
import { parsePageable } from '../common/pagination/pageable';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateReservationDto,
  CreateReservationResponse,
  ReservationResponse,
  createReservationSchema,
} from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';

@Controller('api/reservation')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  /** `inicio` e `fim` são obrigatórios; sem eles o Spring responde 400. */
  @Get()
  getAll(@Query() query: Record<string, string>): Promise<PageEnvelope<ReservationResponse>> {
    return this.reservationsService.findPaged(
      {
        start: this.requireDate(query.inicio, 'inicio'),
        end: this.requireDate(query.fim, 'fim'),
        requesterName: query.solicitante ?? null,
        roomName: query.sala ?? null,
        sectionName: query.setor ?? null,
        roomId: parseOptionalId(query.salaId),
        requesterId: parseOptionalId(query.solicitanteId),
        sectionId: parseOptionalId(query.setorId),
      },
      parsePageable(query),
    );
  }

  @Get('current-month')
  getCurrentMonth(@Query() query: Record<string, string>): Promise<ReservationResponse[]> {
    return this.reservationsService.findCurrentMonth(
      parseOptionalId(query.setorId),
      query.setor ?? null,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(zodPipe(createReservationSchema)) dto: CreateReservationDto,
    @CurrentUserId() userId: number,
  ): Promise<CreateReservationResponse> {
    return this.reservationsService.create(dto, userId);
  }

  /** Cancelamento pontual é PATCH; cancelamento de série é DELETE. */
  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.reservationsService.cancel(id);
  }

  @Delete('recurrent/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelRecurrence(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.reservationsService.cancelRecurrence(id);
  }

  private requireDate(value: string | undefined, field: string): Date {
    if (!value) {
      throw new ValidationError(
        `Required request parameter '${field}' for method parameter type LocalDateTime is not present`,
      );
    }
    return requireLocalDateTime(value, field);
  }
}

function parseOptionalId(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}
