import { Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../common/errors/domain-errors';
import { UserDocument } from '../database/documents';
import { UsersRepository } from './users.repository';

/** Equivalente ao `UserDomainService` do Java. */
@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async findById(id: number): Promise<UserDocument> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new EntityNotFoundError('Usuário não encontrado!');
    }
    return user;
  }

  findAll(): Promise<UserDocument[]> {
    return this.repository.findAll();
  }
}
