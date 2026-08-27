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
  CreateRoomDto,
  CreateRoomResponse,
  RoomResponse,
  UpdateRoomDto,
  createRoomSchema,
  occupiedSchema,
  updateRoomSchema,
} from './dto/room.dto';
import { RoomsService } from './rooms.service';

type RoomListResult = RoomResponse[] | PageEnvelope<RoomResponse>;

@Controller('api/room')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  getAll(@Query() query: Record<string, string>): Promise<RoomListResult> {
    return this.list(query, null);
  }

  /** Rota mais específica antes de `:id` para o Express não capturar "section" como id. */
  @Get('section/:sectionId')
  getBySection(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Query() query: Record<string, string>,
  ): Promise<RoomListResult> {
    return this.list(query, sectionId);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number): Promise<RoomResponse> {
    return this.roomsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(zodPipe(createRoomSchema)) dto: CreateRoomDto,
    @CurrentUserId() userId: number,
  ): Promise<CreateRoomResponse> {
    return this.roomsService.create(dto, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(zodPipe(updateRoomSchema)) dto: UpdateRoomDto,
    @CurrentUserId() userId: number,
  ): Promise<CreateRoomResponse> {
    return this.roomsService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number): Promise<void> {
    return this.roomsService.remove(id, userId);
  }

  /** `/api/room` aceita filtro por nome de setor; `/api/room/section/{id}` não. */
  private list(query: Record<string, string>, sectionId: number | null): Promise<RoomListResult> {
    const filters = {
      name: query.nome,
      sectionName: sectionId === null ? query.setor : null,
      sectionId,
      occupied: occupiedSchema.parse(query.ocupada),
    };

    if (unpagedSchema.parse(query.unpaged)) {
      return this.roomsService.findUnpaged(filters);
    }

    return this.roomsService.findPaged(filters, parsePageable(query));
  }
}
