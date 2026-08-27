import { Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

/**
 * Global porque o `JwtAuthGuard`, registrado como guard de aplicação, depende do
 * `TokenService`.
 */
@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
  exports: [TokenService],
})
export class AuthModule {}
