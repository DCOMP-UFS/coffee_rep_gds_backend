import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RequestersModule } from '../requesters/requesters.module';
import { RequesterAbsencesController } from './requester-absences.controller';
import { RequesterAbsencesRepository } from './requester-absences.repository';
import { RequesterAbsencesService } from './requester-absences.service';

@Module({
  imports: [RequestersModule, AuditModule],
  controllers: [RequesterAbsencesController],
  providers: [RequesterAbsencesRepository, RequesterAbsencesService],
  exports: [RequesterAbsencesRepository],
})
export class RequesterAbsencesModule {}
