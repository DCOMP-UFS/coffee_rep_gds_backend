import { Controller, Get, Query } from '@nestjs/common';
import { PageEnvelope } from '../common/pagination/page';
import { parsePageable, unpagedSchema } from '../common/pagination/pageable';
import { AuditService } from './audit.service';
import { AuditEventResponse } from './dto/audit.dto';

@Controller('api/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  getAll(
    @Query() query: Record<string, string>,
  ): Promise<AuditEventResponse[] | PageEnvelope<AuditEventResponse>> {
    if (unpagedSchema.parse(query.unpaged)) {
      return this.auditService.findUnpaged(query);
    }
    return this.auditService.findPaged(query, parsePageable(query));
  }
}
