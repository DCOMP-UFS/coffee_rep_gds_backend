import { Inject, Injectable } from '@nestjs/common';
import { Collection, Db, Filter } from 'mongodb';
import { paginationStages, recencySortStages } from '../common/pagination/sort-stages';
import { containsIgnoreCase, equalsIgnoreCase } from '../common/validation/text';
import { COLLECTIONS, STATUS_ACTIVE, SectionDocument } from '../database/documents';
import { CountersService } from '../database/counters.service';
import { MONGO_DB } from '../database/mongo.tokens';

@Injectable()
export class SectionsRepository {
  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly counters: CountersService,
  ) {}

  private get collection(): Collection<SectionDocument> {
    return this.db.collection<SectionDocument>(COLLECTIONS.sections);
  }

  /** `SectionSpecification.filter`: só ativos, nome com LIKE case-insensitive. */
  private activeFilter(name?: string | null): Filter<SectionDocument> {
    const filter: Filter<SectionDocument> = { status: STATUS_ACTIVE };
    if (name && name.trim()) {
      filter.name = { $regex: containsIgnoreCase(name.trim()) };
    }
    return filter;
  }

  async findActive(
    name: string | null | undefined,
    pageable: { page: number; size: number } | null,
  ): Promise<{ items: SectionDocument[]; total: number }> {
    const filter = this.activeFilter(name);
    const stages = [{ $match: filter }, ...recencySortStages()];

    if (pageable) {
      stages.push(...paginationStages(pageable.page, pageable.size));
    }

    const [items, total] = await Promise.all([
      this.collection.aggregate<SectionDocument>(stages).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { items, total };
  }

  findById(id: number): Promise<SectionDocument | null> {
    return this.collection.findOne({ _id: id });
  }

  findActiveById(id: number): Promise<SectionDocument | null> {
    return this.collection.findOne({ _id: id, status: STATUS_ACTIVE });
  }

  /** `findByNameIgnoreCase`: busca global, sem filtrar status. */
  findByName(name: string): Promise<SectionDocument | null> {
    return this.collection.findOne({ name: { $regex: equalsIgnoreCase(name) } });
  }

  /** Outro setor ativo com o mesmo nome, ignorando o próprio registro. */
  findActiveByNameExcluding(name: string, id: number): Promise<SectionDocument | null> {
    return this.collection.findOne({
      _id: { $ne: id },
      status: STATUS_ACTIVE,
      name: { $regex: equalsIgnoreCase(name) },
    });
  }

  async insert(section: Omit<SectionDocument, '_id'>): Promise<SectionDocument> {
    const document: SectionDocument = {
      ...section,
      _id: await this.counters.next(COLLECTIONS.sections),
    };
    await this.collection.insertOne(document);
    return document;
  }

  async update(id: number, changes: Partial<SectionDocument>): Promise<SectionDocument> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id },
      { $set: changes },
      { returnDocument: 'after' },
    );

    if (!result) {
      throw new Error(`Setor ${id} desapareceu durante a atualização.`);
    }

    return result;
  }
}
