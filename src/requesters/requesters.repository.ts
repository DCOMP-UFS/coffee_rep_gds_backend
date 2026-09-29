import { Inject, Injectable } from '@nestjs/common';
import { Collection, Db, Filter } from 'mongodb';
import { PT_COLLATION, SortableFields, SortSpec, sortStages } from '../common/pagination/sort';
import { paginationStages } from '../common/pagination/sort-stages';
import { contains, containsIgnoreCase, equalsIgnoreCase } from '../common/validation/text';
import { COLLECTIONS, RequesterDocument, STATUS_ACTIVE } from '../database/documents';
import { CountersService } from '../database/counters.service';
import { MONGO_DB } from '../database/mongo.tokens';

export interface RequesterFilters {
  /** Busca em OR sobre nome, especialidade e telefone. */
  search?: string | null;
  /** Especialidade exata, sem diferenciar maiúsculas. */
  specialty?: string | null;
  /** `null` mantém a ordem por recência. */
  sort?: SortSpec | null;
}

/** Campos aceitos em `?sort=`, com os nomes da resposta. */
export const REQUESTER_SORTABLE_FIELDS: SortableFields = {
  nome: 'name',
  especialidade: 'specialty',
};

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
  private activeFilter({ search, specialty }: RequesterFilters): Filter<RequesterDocument> {
    const filter: Filter<RequesterDocument> = { status: STATUS_ACTIVE };
    const term = search?.trim();
    const specialtyTerm = specialty?.trim();

    if (specialtyTerm) {
      filter.specialty = { $regex: equalsIgnoreCase(specialtyTerm) };
    }

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
    filters: RequesterFilters,
    pageable: { page: number; size: number } | null,
  ): Promise<{ items: RequesterDocument[]; total: number }> {
    const filter = this.activeFilter(filters);
    const stages = [{ $match: filter }, ...sortStages(filters.sort ?? null)];

    if (pageable) {
      stages.push(...paginationStages(pageable.page, pageable.size));
    }

    const [items, total] = await Promise.all([
      this.collection
        .aggregate<RequesterDocument>(stages, { collation: PT_COLLATION })
        .toArray(),
      this.collection.countDocuments(filter, { collation: PT_COLLATION }),
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
