import { Module, forwardRef } from '@nestjs/common';
import { SectionsModule } from '../sections/sections.module';
import { RoomsController } from './rooms.controller';
import { RoomsRepository } from './rooms.repository';
import { RoomsService } from './rooms.service';

@Module({
  imports: [forwardRef(() => SectionsModule)],
  controllers: [RoomsController],
  providers: [RoomsRepository, RoomsService],
  exports: [RoomsRepository, RoomsService],
})
export class RoomsModule {}
