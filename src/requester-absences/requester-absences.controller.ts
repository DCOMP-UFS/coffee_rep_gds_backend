import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateRequesterAbsenceDto,
  RequesterAbsenceResponse,
  createRequesterAbsenceSchema,
} from './dto/requester-absence.dto';
import { RequesterAbsencesService } from './requester-absences.service';

@Controller('api/requester-absence')
export class RequesterAbsencesController {
  constructor(private readonly service: RequesterAbsencesService) {}

  /** Sempre array puro: este recurso nunca é paginado. */
  @Get()
  getAll(@Query('solicitanteId') requesterId?: string): Promise<RequesterAbsenceResponse[]> {
    const parsed = requesterId ? Number.parseInt(requesterId, 10) : null;
    return this.service.findAll(Number.isInteger(parsed) ? parsed : null);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(zodPipe(createRequesterAbsenceSchema)) dto: CreateRequesterAbsenceDto,
    @CurrentUserId() userId: number,
  ): Promise<RequesterAbsenceResponse> {
    return this.service.create(dto, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(zodPipe(createRequesterAbsenceSchema)) dto: CreateRequesterAbsenceDto,
    @CurrentUserId() userId: number,
  ): Promise<RequesterAbsenceResponse> {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
