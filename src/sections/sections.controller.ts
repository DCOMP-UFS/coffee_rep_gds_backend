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
  CreateSectionDto,
  CreateSectionResponse,
  SectionResponse,
  UpdateSectionDto,
  createSectionSchema,
  updateSectionSchema,
} from './dto/section.dto';
import { SectionsService } from './sections.service';

@Controller('api/section')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  /** `unpaged=true` devolve array puro; caso contrário, o envelope `{content, page}`. */
  @Get()
  getAll(
    @Query() query: Record<string, string>,
  ): Promise<SectionResponse[] | PageEnvelope<SectionResponse>> {
    const name = query.name;

    if (unpagedSchema.parse(query.unpaged)) {
      return this.sectionsService.findActiveUnpaged(name);
    }

    return this.sectionsService.findActivePaged(name, parsePageable(query));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(zodPipe(createSectionSchema)) dto: CreateSectionDto,
    @CurrentUserId() userId: number,
  ): Promise<CreateSectionResponse> {
    return this.sectionsService.create(dto, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(zodPipe(updateSectionSchema)) dto: UpdateSectionDto,
    @CurrentUserId() userId: number,
  ): Promise<CreateSectionResponse> {
    return this.sectionsService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number): Promise<void> {
    return this.sectionsService.remove(id, userId);
  }
}
