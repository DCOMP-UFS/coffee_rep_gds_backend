import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { MongoModule } from './database/mongo.module';
import { HealthController } from './health/health.controller';
import { RequesterAbsencesModule } from './requester-absences/requester-absences.module';
import { RequestersModule } from './requesters/requesters.module';
import { ReservationsModule } from './reservations/reservations.module';
import { RoomsModule } from './rooms/rooms.module';
import { SectionsModule } from './sections/sections.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    MongoModule,
    AuthModule,
    UsersModule,
    SectionsModule,
    RoomsModule,
    RequestersModule,
    RequesterAbsencesModule,
    ReservationsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Equivale a `anyRequest().authenticated()`: autenticado por padrão, exceções via @Public.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
