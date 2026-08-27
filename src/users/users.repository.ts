import { Inject, Injectable } from '@nestjs/common';
import { Collection, Db } from 'mongodb';
import { COLLECTIONS, UserDocument } from '../database/documents';
import { MONGO_DB } from '../database/mongo.tokens';
import { CountersService } from '../database/counters.service';

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly counters: CountersService,
  ) {}

  private get collection(): Collection<UserDocument> {
    return this.db.collection<UserDocument>(COLLECTIONS.users);
  }

  findById(id: number): Promise<UserDocument | null> {
    return this.collection.findOne({ _id: id });
  }

  findByCpf(cpf: string): Promise<UserDocument | null> {
    return this.collection.findOne({ cpf });
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.collection.findOne({ email });
  }

  findAll(): Promise<UserDocument[]> {
    return this.collection.find().toArray();
  }

  async insert(user: Omit<UserDocument, '_id'>): Promise<UserDocument> {
    const document: UserDocument = { ...user, _id: await this.counters.next(COLLECTIONS.users) };
    await this.collection.insertOne(document);
    return document;
  }
}
