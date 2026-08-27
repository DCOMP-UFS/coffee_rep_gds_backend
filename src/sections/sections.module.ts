import { Module, forwardRef } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module';
import { SectionsController } from './sections.controller';
import { SectionsRepository } from './sections.repository';
import { SectionsService } from './sections.service';

/**
 * `forwardRef` porque setores e salas se referenciam: o soft delete de setor cascateia
 * para as salas, e a criação de sala valida o setor.
 */
@Module({
  imports: [forwardRef(() => RoomsModule)],
  controllers: [SectionsController],
  providers: [SectionsRepository, SectionsService],
  exports: [SectionsRepository, SectionsService],
})
export class SectionsModule {}
