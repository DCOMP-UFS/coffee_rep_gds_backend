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
import { PageEnvelope } from '../common/pagination/page';
import { parsePageable, unpagedSchema } from '../common/pagination/pageable';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateRequesterDto,
  CreateRequesterResponse,
  RequesterResponse,
  UpdateRequesterDto,
  createRequesterSchema,
  updateRequesterSchema,
} from './dto/requester.dto';
import { RequestersService } from './requesters.service';

@Controller('api/requester')
export class RequestersController {
  constructor(private readonly requestersService: RequestersService) {}

  /** Aceita `busca` e, como fallback, `nome` — os dois nomes existem no contrato atual. */
  @Get()
  getAll(
    @Query() query: Record<string, string>,
  ): Promise<RequesterResponse[] | PageEnvelope<RequesterResponse>> {
    const search = query.busca ?? query.nome;

    if (unpagedSchema.parse(query.unpaged)) {
      return this.requestersService.findActiveUnpaged(search);
    }

    return this.requestersService.findActivePaged(search, parsePageable(query));
  }

  /**
   * Herdado do modelo antigo, em que solicitante tinha "tipo". A tabela foi removida e o
   * endpoint passou a se comportar como a listagem comum, ignorando o id do caminho.
   */
  @Get('type/:requesterTypeId')
  getByType(
    @Param('requesterTypeId', ParseIntPipe) _requesterTypeId: number,
    @Query() query: Record<string, string>,
  ): Promise<PageEnvelope<RequesterResponse>> {
    return this.requestersService.findActivePaged(query.nome, parsePageable(query));
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number): Promise<RequesterResponse> {
    return this.requestersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(zodPipe(createRequesterSchema)) dto: CreateRequesterDto,
    @CurrentUserId() userId: number,
  ): Promise<CreateRequesterResponse> {
    return this.requestersService.create(dto, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(zodPipe(updateRequesterSchema)) dto: UpdateRequesterDto,
    @CurrentUserId() userId: number,
  ): Promise<CreateRequesterResponse> {
    return this.requestersService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number): Promise<void> {
    return this.requestersService.remove(id, userId);
  }
}
