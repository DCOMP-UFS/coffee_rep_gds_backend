import { Inject, Injectable } from '@nestjs/common';
import { Collection, Db, Document } from 'mongodb';
import { nowWallClock, startOfUtcDay } from '../common/date/local-date-time';
import { paginationStages, recencySortStages } from '../common/pagination/sort-stages';
import { contains, equalsIgnoreCase } from '../common/validation/text';
import {
  COLLECTIONS,
  RESERVATION_APPROVED,
  RoomDocument,
  STATUS_ACTIVE,
  STATUS_INACTIVE,
} from '../database/documents';
import { CountersService } from '../database/counters.service';
import { MONGO_DB } from '../database/mongo.tokens';

export interface RoomFilters {
  name?: string | null;
  sectionName?: string | null;
  sectionId?: number | null;
  /** `null` traz todas; `true` só ocupadas; `false` só livres. */
  occupied?: boolean | null;
}

/** Sala com o nome do setor e a ocupação já calculados. */
export interface RoomWithOccupation {
  _id: number;
  name: string;
  sectionId: number;
  sectionName: string;
  occupied: boolean;
}

@Injectable()
export class RoomsRepository {
  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly counters: CountersService,
  ) {}

  private get collection(): Collection<RoomDocument> {
    return this.db.collection<RoomDocument>(COLLECTIONS.rooms);
  }

  /**
   * Reproduz a consulta nativa de ocupação do `RoomRepository` do Java.
   *
   * Uma sala está ocupada quando existe reserva aprovada cujo intervalo contém o
   * instante atual **e** o profissional dessa reserva não está em ausência hoje — a
   * regra "HU Sergipe", em que férias do profissional liberam a sala.
   *
   * O `LIKE` de nome de sala e de setor é case-sensitive aqui, ao contrário dos demais
   * filtros do sistema, porque o SQL original não aplica `LOWER`.
   */
  private occupationStages(filters: RoomFilters): Document[] {
    const now = nowWallClock();
    const today = startOfUtcDay(now);

    const match: Document = { status: STATUS_ACTIVE };
    if (filters.name?.trim()) {
      match.name = { $regex: contains(filters.name.trim()) };
    }
    if (filters.sectionId !== null && filters.sectionId !== undefined) {
      match.sectionId = filters.sectionId;
    }

    const stages: Document[] = [
      { $match: match },
      {
        $lookup: {
          from: COLLECTIONS.sections,
          localField: 'sectionId',
          foreignField: '_id',
          as: 'section',
        },
      },
      // JOIN, não LEFT JOIN: sala sem setor válido não aparece, como no SQL original.
      { $unwind: '$section' },
    ];

    if (filters.sectionName?.trim()) {
      stages.push({ $match: { 'section.name': { $regex: contains(filters.sectionName.trim()) } } });
    }

    stages.push(
      {
        $lookup: {
          from: COLLECTIONS.reservations,
          let: { roomId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$roomId', '$$roomId'] },
                    { $eq: ['$status', RESERVATION_APPROVED] },
                    { $lte: ['$startDate', now] },
                    { $gte: ['$endDate', now] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: COLLECTIONS.requesterAbsences,
                let: { requesterId: '$requesterId' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$requesterId', '$$requesterId'] },
                          { $lte: ['$startDate', today] },
                          { $gte: ['$endDate', today] },
                        ],
                      },
                    },
                  },
                  { $limit: 1 },
                ],
                as: 'absences',
              },
            },
            { $match: { absences: { $size: 0 } } },
            { $limit: 1 },
          ],
          as: 'currentReservations',
        },
      },
      { $addFields: { occupied: { $gt: [{ $size: '$currentReservations' }, 0] } } },
    );

    if (filters.occupied !== null && filters.occupied !== undefined) {
      stages.push({ $match: { occupied: filters.occupied } });
    }

    return stages;
  }

  private projectionStage(): Document {
    return {
      $project: {
        _id: 1,
        name: 1,
        sectionId: 1,
        sectionName: '$section.name',
        occupied: 1,
      },
    };
  }

  async findWithOccupation(
    filters: RoomFilters,
    pageable: { page: number; size: number } | null,
  ): Promise<{ items: RoomWithOccupation[]; total: number }> {
    const base = this.occupationStages(filters);

    const listStages: Document[] = [...base, ...recencySortStages()];
    if (pageable) {
      listStages.push(...paginationStages(pageable.page, pageable.size));
    }
    listStages.push(this.projectionStage());

    const [items, counted] = await Promise.all([
      this.collection.aggregate<RoomWithOccupation>(listStages).toArray(),
      this.collection.aggregate<{ total: number }>([...base, { $count: 'total' }]).toArray(),
    ]);

    return { items, total: counted[0]?.total ?? 0 };
  }

  async findActiveWithOccupationById(id: number): Promise<RoomWithOccupation | null> {
    const stages = [...this.occupationStages({}), { $match: { _id: id } }, this.projectionStage()];
    const [room] = await this.collection.aggregate<RoomWithOccupation>(stages).toArray();
    return room ?? null;
  }

  findActiveById(id: number): Promise<RoomDocument | null> {
    return this.collection.findOne({ _id: id, status: STATUS_ACTIVE });
  }

  /** `getRoomByNameIgnoreCaseAndSection`: unicidade é por par (nome, setor). */
  findByNameAndSection(name: string, sectionId: number): Promise<RoomDocument | null> {
    return this.collection.findOne({ sectionId, name: { $regex: equalsIgnoreCase(name) } });
  }

  async insert(room: Omit<RoomDocument, '_id'>): Promise<RoomDocument> {
    const document: RoomDocument = {
      ...room,
      _id: await this.counters.next(COLLECTIONS.rooms),
    };
    await this.collection.insertOne(document);
    return document;
  }

  async update(id: number, changes: Partial<RoomDocument>): Promise<RoomDocument> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id },
      { $set: changes },
      { returnDocument: 'after' },
    );

    if (!result) {
      throw new Error(`Sala ${id} desapareceu durante a atualização.`);
    }

    return result;
  }

  /** Cascata do soft delete de setor. Não alcança reservas, como no Java. */
  async deactivateBySection(sectionId: number, userId: number, at: Date): Promise<void> {
    await this.collection.updateMany(
      { sectionId, status: STATUS_ACTIVE },
      { $set: { status: STATUS_INACTIVE, updatedAt: at, updatedBy: userId } },
    );
  }
}
