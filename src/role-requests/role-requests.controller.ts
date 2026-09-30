import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AuthenticatedUser, CurrentUser, CurrentUserId } from '../auth/current-user';
import { RequirePermission } from '../auth/require-permission.decorator';
import { PageEnvelope } from '../common/pagination/page';
import { parsePageable } from '../common/pagination/pageable';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateRoleRequestDto,
  RejectRoleRequestDto,
  RoleRequestResponse,
  RoleRequestSummaryResponse,
  createRoleRequestSchema,
  rejectRoleRequestSchema,
  roleRequestStatusFilterSchema,
} from './dto/role-request.dto';
import { RoleRequestsService } from './role-requests.service';

@Controller('api/role-request')
export class RoleRequestsController {
  constructor(private readonly service: RoleRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(zodPipe(createRoleRequestSchema)) dto: CreateRoleRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoleRequestResponse> {
    return this.service.create(dto, user);
  }

  /** Rotas fixas antes de `:id` para o Express não capturar "me" e "summary" como id. */
  @Get('me')
  findMine(@CurrentUserId() userId: number): Promise<RoleRequestResponse[]> {
    return this.service.findMine(userId);
  }

  @RequirePermission('roleRequests.review')
  @Get('summary')
  summary(): Promise<RoleRequestSummaryResponse> {
    return this.service.summary();
  }

  @RequirePermission('roleRequests.review')
  @Get()
  findPaged(@Query() query: Record<string, string>): Promise<PageEnvelope<RoleRequestResponse>> {
    return this.service.findPaged(
      roleRequestStatusFilterSchema.parse(query.status),
      parsePageable(query),
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoleRequestResponse> {
    return this.service.cancel(id, user);
  }

  @RequirePermission('roleRequests.review')
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() reviewerId: number,
  ): Promise<RoleRequestResponse> {
    return this.service.approve(id, reviewerId);
  }

  @RequirePermission('roleRequests.review')
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body(zodPipe(rejectRoleRequestSchema)) dto: RejectRoleRequestDto,
    @CurrentUserId() reviewerId: number,
  ): Promise<RoleRequestResponse> {
    return this.service.reject(id, reviewerId, dto.reason);
  }
}
