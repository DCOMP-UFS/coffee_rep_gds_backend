import { Inject, Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { COLLECTIONS, CounterDocument } from './documents';
import { MONGO_DB } from './mongo.tokens';

/**
 * Substitui as sequences do Postgres. O `findOneAndUpdate` com `$inc` é atômico no
 * MongoDB, o que também elimina a corrida do `MAX(recurrence_id) + 1` do Java.
 */
@Injectable()
export class CountersService {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  async next(counter: string): Promise<number> {
    const result = await this.db
      .collection<CounterDocument>(COLLECTIONS.counters)
      .findOneAndUpdate(
        { _id: counter },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' },
      );

    if (!result) {
      throw new Error(`Não foi possível gerar o próximo id para '${counter}'.`);
    }

    return result.seq;
  }
}
