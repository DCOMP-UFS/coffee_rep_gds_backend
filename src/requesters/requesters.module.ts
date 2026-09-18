import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RequestersController } from './requesters.controller';
import { RequestersRepository } from './requesters.repository';
import { RequestersService } from './requesters.service';

@Module({
  imports: [AuditModule],
  controllers: [RequestersController],
  providers: [RequestersRepository, RequestersService],
  exports: [RequestersRepository, RequestersService],
})
export class RequestersModule {}
