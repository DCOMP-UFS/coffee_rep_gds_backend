import { Inject, Injectable } from '@nestjs/common';
import { Collection, Db } from 'mongodb';
import { COLLECTIONS, RequesterAbsenceDocument } from '../database/documents';
import { CountersService } from '../database/counters.service';
import { MONGO_DB } from '../database/mongo.tokens';

@Injectable()
export class RequesterAbsencesRepository {
  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly counters: CountersService,
  ) {}

  private get collection(): Collection<RequesterAbsenceDocument> {
    return this.db.collection<RequesterAbsenceDocument>(COLLECTIONS.requesterAbsences);
  }

  /** Sem `solicitanteId` a listagem vem sem ordenação definida, como o `findAll()` do Java. */
  findAll(): Promise<RequesterAbsenceDocument[]> {
    return this.collection.find().toArray();
  }

  findByRequester(requesterId: number): Promise<RequesterAbsenceDocument[]> {
    return this.collection.find({ requesterId }).sort({ startDate: -1 }).toArray();
  }

  findById(id: number): Promise<RequesterAbsenceDocument | null> {
    return this.collection.findOne({ _id: id });
  }

  /**
   * Ausências dos solicitantes informados que tocam o período dado. Serve para resolver
   * a flag `profissionalAusente` de uma página inteira de reservas numa consulta só, em
   * vez do N+1 do backend Java.
   */
  findOverlapping(
    requesterIds: number[],
    from: Date,
    to: Date,
  ): Promise<RequesterAbsenceDocument[]> {
    return this.collection
      .find({
        requesterId: { $in: requesterIds },
        startDate: { $lte: to },
        endDate: { $gte: from },
      })
      .toArray();
  }

  async insert(
    absence: Omit<RequesterAbsenceDocument, '_id'>,
  ): Promise<RequesterAbsenceDocument> {
    const document: RequesterAbsenceDocument = {
      ...absence,
      _id: await this.counters.next(COLLECTIONS.requesterAbsences),
    };
    await this.collection.insertOne(document);
    return document;
  }

  async update(
    id: number,
    changes: Partial<RequesterAbsenceDocument>,
  ): Promise<RequesterAbsenceDocument> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id },
      { $set: changes },
      { returnDocument: 'after' },
    );

    if (!result) {
      throw new Error(`Ausência ${id} desapareceu durante a atualização.`);
    }

    return result;
  }

  /** Exclusão definitiva: ausência é o único agregado sem soft delete. */
  async deleteById(id: number): Promise<boolean> {
    const { deletedCount } = await this.collection.deleteOne({ _id: id });
    return deletedCount > 0;
  }
}
