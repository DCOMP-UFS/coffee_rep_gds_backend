import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

/**
 * Global porque o `JwtAuthGuard`, registrado como guard de aplicação, depende do
 * `TokenService` e do `UsersRepository` (reexportado via `UsersModule`) em qualquer módulo.
 */
@Global()
@Module({
  imports: [UsersModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
  exports: [TokenService, UsersModule],
})
export class AuthModule {}
