import { Controller, Get } from '@nestjs/common';
import { Authorities } from '../auth/authorities.decorator';
import { CurrentUserId } from '../auth/current-user';
import { UserResponse, toUserResponse } from './users.mapper';
import { UsersService } from './users.service';

@Controller('api/user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Diferente do Java, a senha (hash BCrypt) não é exposta aqui. O endpoint não é
   * consumido pelo frontend, e replicar o vazamento seria criar um problema de segurança
   * novo em vez de preservar um contrato.
   */
  @Authorities('SCOPE_ADMIN')
  @Get()
  async listUsers(): Promise<UserResponse[]> {
    const users = await this.usersService.findAll();
    return users.map(toUserResponse);
  }

  @Authorities('SCOPE_ADMIN', 'SCOPE_BASIC')
  @Get('authority')
  async authority(@CurrentUserId() userId: number): Promise<string> {
    const user = await this.usersService.findById(userId);
    return user.name ?? '';
  }

  @Get('noauthority')
  async noAuthority(@CurrentUserId() userId: number): Promise<string> {
    const user = await this.usersService.findById(userId);
    return user.name ?? '';
  }
}
