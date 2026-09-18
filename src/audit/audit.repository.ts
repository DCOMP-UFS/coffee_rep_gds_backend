import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Collection, Db, Filter } from 'mongodb';
import { Pageable } from '../common/pagination/pageable';
import { AuditEventDocument, COLLECTIONS } from '../database/documents';
import { CountersService } from '../database/counters.service';
import { MONGO_DB } from '../database/mongo.tokens';

export interface AuditListFilters {
  q?: string | null;
  action?: string | null;
  entityType?: string | null;
  createdFrom?: Date | null;
  createdTo?: Date | null;
}

@Injectable()
export class AuditRepository implements OnModuleInit {
  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly counters: CountersService,
  ) {}

  private get collection(): Collection<AuditEventDocument> {
    return this.db.collection<AuditEventDocument>(COLLECTIONS.auditEvents);
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.collection.createIndex({ createdAt: -1 }),
      this.collection.createIndex({ action: 1, createdAt: -1 }),
      this.collection.createIndex({ entityType: 1, entityId: 1, createdAt: -1 }),
      this.collection.createIndex({
        'details.backfillSource': 1,
        'details.backfillSourceId': 1,
        action: 1,
      }),
    ]);
  }

  async insert(event: Omit<AuditEventDocument, '_id'>): Promise<AuditEventDocument> {
    const document: AuditEventDocument = {
      ...event,
      _id: await this.counters.next(COLLECTIONS.auditEvents),
    };
    await this.collection.insertOne(document);
    return document;
  }

  async existsBackfill(source: string, sourceId: number, action: string): Promise<boolean> {
    const found = await this.collection.findOne({
      action,
      'details.backfillSource': source,
      'details.backfillSourceId': sourceId,
    } as Filter<AuditEventDocument>);
    return found !== null;
  }

  async findPaged(
    filters: AuditListFilters,
    pageable: Pageable,
  ): Promise<{ items: AuditEventDocument[]; total: number }> {
    const filter = this.buildFilter(filters);
    const [items, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(pageable.page * pageable.size)
        .limit(pageable.size)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { items, total };
  }

  async findUnpaged(filters: AuditListFilters): Promise<AuditEventDocument[]> {
    return this.collection
      .find(this.buildFilter(filters))
      .sort({ createdAt: -1, _id: -1 })
      .toArray();
  }

  private buildFilter(filters: AuditListFilters): Filter<AuditEventDocument> {
    const filter: Filter<AuditEventDocument> = {};

    if (filters.action?.trim()) {
      filter.action = filters.action.trim();
    }

    if (filters.entityType?.trim()) {
      filter.entityType = filters.entityType.trim();
    }

    if (filters.createdFrom || filters.createdTo) {
      filter.createdAt = {};
      if (filters.createdFrom) {
        filter.createdAt.$gte = filters.createdFrom;
      }
      if (filters.createdTo) {
        filter.createdAt.$lte = filters.createdTo;
      }
    }

    const q = filters.q?.trim();
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = { $regex: escaped, $options: 'i' };
      const or: Filter<AuditEventDocument>[] = [
        { actorName: regex },
        { action: regex },
        { entityType: regex },
      ];
      const asId = Number(q);
      if (Number.isInteger(asId)) {
        or.push({ entityId: asId });
      }
      filter.$or = or;
    }

    return filter;
  }
}
