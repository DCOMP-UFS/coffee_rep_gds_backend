import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RequesterAbsencesModule } from '../requester-absences/requester-absences.module';
import { RequestersModule } from '../requesters/requesters.module';
import { RoomsModule } from '../rooms/rooms.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsRepository } from './reservations.repository';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [RoomsModule, RequestersModule, RequesterAbsencesModule, AuditModule],
  controllers: [ReservationsController],
  providers: [ReservationsRepository, ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
