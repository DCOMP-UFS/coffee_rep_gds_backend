import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { RoleRequestsController } from './role-requests.controller';
import { RoleRequestsRepository } from './role-requests.repository';
import { RoleRequestsService } from './role-requests.service';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';

@Module({
  imports: [UsersModule, AuditModule, MailModule],
  controllers: [RoleRequestsController, UserRolesController],
  providers: [RoleRequestsRepository, RoleRequestsService, UserRolesService],
})
export class RoleRequestsModule {}
