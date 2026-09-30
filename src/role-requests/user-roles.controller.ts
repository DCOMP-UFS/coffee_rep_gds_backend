import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user';
import { RequirePermission } from '../auth/require-permission.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { UserResponse } from '../users/users.mapper';
import { ChangeUserRoleDto, changeUserRoleSchema } from './dto/role-request.dto';
import { UserRolesService } from './user-roles.service';

/**
 * Fica neste módulo, e não em `users`, porque depende da auditoria e dos pedidos; o
 * `AuditModule` já importa o `UsersModule`, e o caminho inverso criaria um ciclo.
 */
@Controller('api/user')
export class UserRolesController {
  constructor(private readonly service: UserRolesService) {}

  @RequirePermission('users.manage')
  @Patch(':id/role')
  changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body(zodPipe(changeUserRoleSchema)) dto: ChangeUserRoleDto,
    @CurrentUserId() actorId: number,
  ): Promise<UserResponse> {
    return this.service.changeRole(id, dto.role, actorId);
  }
}
