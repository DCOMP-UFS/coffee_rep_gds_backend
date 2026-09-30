import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Collection, Db, Filter } from 'mongodb';
import { nowWallClock } from '../common/date/local-date-time';
import { Pageable } from '../common/pagination/pageable';
import { CountersService } from '../database/counters.service';
import {
  COLLECTIONS,
  ROLE_REQUEST_PENDING,
  RoleRequestDocument,
  RoleRequestStatus,
} from '../database/documents';
import { MONGO_DB } from '../database/mongo.tokens';

/** Código do MongoDB para violação de índice único. */
const DUPLICATE_KEY_ERROR = 11000;

export function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === DUPLICATE_KEY_ERROR;
}

/**
 * Também usada pelo script `db:migrate-roles`. O índice único parcial garante no banco
 * que cada usuário tenha no máximo um pedido pendente, mesmo com requisições simultâneas.
 */
export async function ensureRoleRequestIndexes(
  collection: Collection<RoleRequestDocument>,
): Promise<void> {
  await Promise.all([
    collection.createIndex(
      { userId: 1 },
      {
        name: 'uniq_pending_per_user',
        unique: true,
        partialFilterExpression: { status: ROLE_REQUEST_PENDING },
      },
    ),
    collection.createIndex({ userId: 1, createdAt: -1 }),
    collection.createIndex({ status: 1, createdAt: -1 }),
  ]);
}

export interface RoleRequestReview {
  status: Exclude<RoleRequestStatus, typeof ROLE_REQUEST_PENDING>;
  reviewedBy: number | null;
  reviewNote: string | null;
}

@Injectable()
export class RoleRequestsRepository implements OnModuleInit {
  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly counters: CountersService,
  ) {}

  private get collection(): Collection<RoleRequestDocument> {
    return this.db.collection<RoleRequestDocument>(COLLECTIONS.roleRequests);
  }

  async onModuleInit(): Promise<void> {
    await ensureRoleRequestIndexes(this.collection);
  }

  async insert(request: Omit<RoleRequestDocument, '_id'>): Promise<RoleRequestDocument> {
    const document: RoleRequestDocument = {
      ...request,
      _id: await this.counters.next(COLLECTIONS.roleRequests),
    };
    await this.collection.insertOne(document);
    return document;
  }

  findById(id: number): Promise<RoleRequestDocument | null> {
    return this.collection.findOne({ _id: id });
  }

  findPendingByUserId(userId: number): Promise<RoleRequestDocument | null> {
    return this.collection.findOne({ userId, status: ROLE_REQUEST_PENDING });
  }

  findByUserId(userId: number): Promise<RoleRequestDocument[]> {
    return this.collection.find({ userId }).sort({ createdAt: -1, _id: -1 }).toArray();
  }

  async findPaged(
    status: RoleRequestStatus | undefined,
    pageable: Pageable,
  ): Promise<{ items: RoleRequestDocument[]; total: number }> {
    const filter: Filter<RoleRequestDocument> = status ? { status } : {};
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

  countPending(): Promise<number> {
    return this.collection.countDocuments({ status: ROLE_REQUEST_PENDING });
  }

  /**
   * Encerra um pedido só se ele ainda estiver pendente. Devolve `null` quando outra
   * requisição chegou antes, o que evita aprovar ou recusar o mesmo pedido duas vezes.
   */
  closePending(id: number, review: RoleRequestReview): Promise<RoleRequestDocument | null> {
    return this.collection.findOneAndUpdate(
      { _id: id, status: ROLE_REQUEST_PENDING },
      { $set: { ...review, reviewedAt: nowWallClock() } },
      { returnDocument: 'after' },
    );
  }

  closePendingOfUser(userId: number, review: RoleRequestReview): Promise<RoleRequestDocument | null> {
    return this.collection.findOneAndUpdate(
      { userId, status: ROLE_REQUEST_PENDING },
      { $set: { ...review, reviewedAt: nowWallClock() } },
      { returnDocument: 'after' },
    );
  }
}
