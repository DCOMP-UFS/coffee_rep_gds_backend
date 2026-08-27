import { Module } from '@nestjs/common';
import { RequestersController } from './requesters.controller';
import { RequestersRepository } from './requesters.repository';
import { RequestersService } from './requesters.service';

@Module({
  controllers: [RequestersController],
  providers: [RequestersRepository, RequestersService],
  exports: [RequestersRepository, RequestersService],
})
export class RequestersModule {}
