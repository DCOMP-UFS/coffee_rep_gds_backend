import { Inject, Injectable } from '@nestjs/common';
import { Collection, Db, Document } from 'mongodb';
import { paginationStages, recencySortStages } from '../common/pagination/sort-stages';
import { containsIgnoreCase } from '../common/validation/text';
import {
  COLLECTIONS,
  RESERVATION_APPROVED,
  RESERVATION_CANCELLED,
  ReservationDocument,
} from '../database/documents';
import { CountersService } from '../database/counters.service';
import { MONGO_DB } from '../database/mongo.tokens';

export interface ReservationFilters {
  start: Date;
  end: Date;
  requesterName?: string | null;
  roomName?: string | null;
  sectionName?: string | null;
  roomId?: number | null;
  requesterId?: number | null;
  sectionId?: number | null;
}

/** Reserva já enriquecida com sala, setor, solicitante e criador. */
export interface ReservationView extends ReservationDocument {
  roomName: string;
  sectionId: number;
  sectionName: string;
  requesterName: string;
  createdByName: string | null;
}

@Injectable()
export class ReservationsRepository {
  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly counters: CountersService,
  ) {}

  private get collection(): Collection<ReservationDocument> {
    return this.db.collection<ReservationDocument>(COLLECTIONS.reservations);
  }

  /**
   * Junta sala, setor, solicitante e criador. O `updatedBy` das reservas guarda quem
   * **criou** a reserva, não quem alterou por último — é o que a coluna `criador` exibe.
   */
  private joinStages(): Document[] {
    return [
      {
        $lookup: {
          from: COLLECTIONS.rooms,
          localField: 'roomId',
          foreignField: '_id',
          as: 'room',
        },
      },
      { $unwind: '$room' },
      {
        $lookup: {
          from: COLLECTIONS.sections,
          localField: 'room.sectionId',
          foreignField: '_id',
          as: 'section',
        },
      },
      { $unwind: '$section' },
      {
        $lookup: {
          from: COLLECTIONS.requesters,
          localField: 'requesterId',
          foreignField: '_id',
          as: 'requester',
        },
      },
      { $unwind: '$requester' },
      {
        $lookup: {
          from: COLLECTIONS.users,
          localField: 'updatedBy',
          foreignField: '_id',
          as: 'createdBy',
        },
      },
      // LEFT JOIN: reserva sem criador conhecido continua aparecendo, com `criador` nulo.
      { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
    ];
  }

  /**
   * Filtro de período. As quatro cláusulas OR do `ReservationSpecification` do Java
   * equivalem à interseção de intervalos fechados, que é o que está expresso aqui.
   */
  private filterStages(filters: ReservationFilters): Document[] {
    const match: Document = {
      status: RESERVATION_APPROVED,
      startDate: { $lte: filters.end },
      endDate: { $gte: filters.start },
    };

    if (filters.roomId !== null && filters.roomId !== undefined) match.roomId = filters.roomId;
    if (filters.requesterId !== null && filters.requesterId !== undefined) {
      match.requesterId = filters.requesterId;
    }

    const stages: Document[] = [{ $match: match }, ...this.joinStages()];

    const joined: Document = {};
    if (filters.roomName) joined['room.name'] = { $regex: containsIgnoreCase(filters.roomName) };
    if (filters.requesterName) {
      joined['requester.name'] = { $regex: containsIgnoreCase(filters.requesterName) };
    }
    if (filters.sectionName) {
      joined['section.name'] = { $regex: containsIgnoreCase(filters.sectionName) };
    }
    if (filters.sectionId !== null && filters.sectionId !== undefined) {
      joined['section._id'] = filters.sectionId;
    }

    if (Object.keys(joined).length > 0) {
      stages.push({ $match: joined });
    }

    return stages;
  }

  private projectionStage(): Document {
    return {
      $addFields: {
        roomName: '$room.name',
        sectionId: '$section._id',
        sectionName: '$section.name',
        requesterName: '$requester.name',
        createdByName: { $ifNull: ['$createdBy.name', null] },
      },
    };
  }

  async find(
    filters: ReservationFilters,
    pageable: { page: number; size: number } | null,
  ): Promise<{ items: ReservationView[]; total: number }> {
    const base = this.filterStages(filters);

    const listStages: Document[] = [...base, ...recencySortStages()];
    if (pageable) {
      listStages.push(...paginationStages(pageable.page, pageable.size));
    }
    listStages.push(this.projectionStage());

    const [items, counted] = await Promise.all([
      this.collection.aggregate<ReservationView>(listStages).toArray(),
      this.collection.aggregate<{ total: number }>([...base, { $count: 'total' }]).toArray(),
    ]);

    return { items, total: counted[0]?.total ?? 0 };
  }

  findApprovedById(id: number): Promise<ReservationDocument | null> {
    return this.collection.findOne({ _id: id, status: RESERVATION_APPROVED });
  }

  /** Conflito com intervalo semiaberto: reservas adjacentes não colidem. */
  async hasOverlap(roomId: number, start: Date, end: Date): Promise<boolean> {
    const conflict = await this.collection.findOne({
      roomId,
      status: RESERVATION_APPROVED,
      startDate: { $lt: end },
      endDate: { $gt: start },
    });

    return conflict !== null;
  }

  nextRecurrenceId(): Promise<number> {
    return this.counters.next('recurrences');
  }

  async insertMany(
    reservations: Array<Omit<ReservationDocument, '_id'>>,
  ): Promise<ReservationDocument[]> {
    const documents: ReservationDocument[] = [];
    for (const reservation of reservations) {
      documents.push({ ...reservation, _id: await this.counters.next(COLLECTIONS.reservations) });
    }

    await this.collection.insertMany(documents);
    return documents;
  }

  async cancelById(id: number): Promise<void> {
    await this.collection.updateOne({ _id: id }, { $set: { status: RESERVATION_CANCELLED } });
  }

  async hasApprovedInRecurrence(recurrenceId: number): Promise<boolean> {
    const found = await this.collection.findOne({ recurrenceId, status: RESERVATION_APPROVED });
    return found !== null;
  }

  /**
   * Cancela a série inteira, inclusive ocorrências passadas — como o
   * `updateStatusByRecurrenceId` do Java, que não filtra por data nem por status.
   */
  async cancelByRecurrenceId(recurrenceId: number): Promise<void> {
    await this.collection.updateMany(
      { recurrenceId },
      { $set: { status: RESERVATION_CANCELLED } },
    );
  }
}
