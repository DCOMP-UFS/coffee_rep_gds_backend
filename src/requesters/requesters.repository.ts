import { Inject, Injectable } from '@nestjs/common';
import { Collection, Db, Filter } from 'mongodb';
import { paginationStages, recencySortStages } from '../common/pagination/sort-stages';
import { contains, containsIgnoreCase } from '../common/validation/text';
import { COLLECTIONS, RequesterDocument, STATUS_ACTIVE } from '../database/documents';
import { CountersService } from '../database/counters.service';
import { MONGO_DB } from '../database/mongo.tokens';

@Injectable()
export class RequestersRepository {
  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly counters: CountersService,
  ) {}

  private get collection(): Collection<RequesterDocument> {
    return this.db.collection<RequesterDocument>(COLLECTIONS.requesters);
  }

  /**
   * `RequesterSpecification.all`: apenas ativos, com busca em OR sobre nome,
   * especialidade e telefone. O telefone só entra quando o termo contém dígitos, e é
   * comparado apenas com os dígitos extraídos.
   */
  private activeFilter(search?: string | null): Filter<RequesterDocument> {
    const filter: Filter<RequesterDocument> = { status: STATUS_ACTIVE };
    const term = search?.trim();

    if (term) {
      const conditions: Filter<RequesterDocument>[] = [
        { name: { $regex: containsIgnoreCase(term) } },
        { specialty: { $regex: containsIgnoreCase(term) } },
      ];

      const digits = term.replace(/\D/g, '');
      if (digits) {
        conditions.push({ contactNumber: { $regex: contains(digits) } });
      }

      filter.$or = conditions;
    }

    return filter;
  }

  async findActive(
    search: string | null | undefined,
    pageable: { page: number; size: number } | null,
  ): Promise<{ items: RequesterDocument[]; total: number }> {
    const filter = this.activeFilter(search);
    const stages = [{ $match: filter }, ...recencySortStages()];

    if (pageable) {
      stages.push(...paginationStages(pageable.page, pageable.size));
    }

    const [items, total] = await Promise.all([
      this.collection.aggregate<RequesterDocument>(stages).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { items, total };
  }

  /** Sem filtro de status: solicitante inativo continua acessível por id, como no Java. */
  findById(id: number): Promise<RequesterDocument | null> {
    return this.collection.findOne({ _id: id });
  }

  findByIds(ids: number[]): Promise<RequesterDocument[]> {
    return this.collection.find({ _id: { $in: ids } }).toArray();
  }

  async insert(requester: Omit<RequesterDocument, '_id'>): Promise<RequesterDocument> {
    const document: RequesterDocument = {
      ...requester,
      _id: await this.counters.next(COLLECTIONS.requesters),
    };
    await this.collection.insertOne(document);
    return document;
  }

  async update(id: number, changes: Partial<RequesterDocument>): Promise<RequesterDocument> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id },
      { $set: changes },
      { returnDocument: 'after' },
    );

    if (!result) {
      throw new Error(`Solicitante ${id} desapareceu durante a atualização.`);
    }

    return result;
  }
}
