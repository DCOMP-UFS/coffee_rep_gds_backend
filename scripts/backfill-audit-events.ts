import { MongoClient } from 'mongodb';
import { loadEnvFile, maskUri, reportAndExit } from './load-env.js';
import { loadEnv } from '../src/config/env';
import {
  alreadyBackfilled,
  inferAbsenceEvents,
  inferCadastroEvents,
  inferReservationEvents,
  inferUserRegisterEvent,
  type InferredAuditEvent,
} from '../src/audit/backfill-inference';
import {
  AuditEventDocument,
  COLLECTIONS,
  CounterDocument,
  RequesterAbsenceDocument,
  RequesterDocument,
  ReservationDocument,
  RoomDocument,
  SectionDocument,
  UserDocument,
} from '../src/database/documents';

/**
 * Backfill parcial e idempotente de eventos de auditoria a partir dos documentos
 * existentes (createdAt/updatedAt/updatedBy).
 *
 *   pnpm exec tsx scripts/backfill-audit-events.ts          # dry-run (padrão)
 *   pnpm exec tsx scripts/backfill-audit-events.ts --apply  # grava de fato
 */

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const envFile = loadEnvFile();
  const env = loadEnv();

  console.log(`Ambiente: ${envFile}`);
  console.log(`Destino:  ${maskUri(env.MONGO_URI)} (banco "${env.MONGO_DB}")`);
  console.log(`Modo:     ${apply ? 'APPLY (grava)' : 'DRY-RUN (não grava)'}`);

  const client = new MongoClient(env.MONGO_URI);
  await client.connect();

  try {
    const db = client.db(env.MONGO_DB);
    const users = await db.collection<UserDocument>(COLLECTIONS.users).find().toArray();
    const nameById = new Map(
      users.map((user) => [user._id, user.name] as const),
    );
    const resolveName = (id: number) => nameById.get(id);

    const auditCol = db.collection<AuditEventDocument>(COLLECTIONS.auditEvents);
    const existingRaw = await auditCol
      .find({ 'details.backfill': true })
      .project({ action: 1, details: 1 })
      .toArray();
    const existing = existingRaw.map((doc) => ({
      action: doc.action,
      details: doc.details ?? {},
    }));

    const inferred: InferredAuditEvent[] = [];

    const sections = await db.collection<SectionDocument>(COLLECTIONS.sections).find().toArray();
    for (const doc of sections) {
      inferred.push(...inferCadastroEvents('sections', 'section', doc, resolveName));
    }

    const rooms = await db.collection<RoomDocument>(COLLECTIONS.rooms).find().toArray();
    for (const doc of rooms) {
      inferred.push(...inferCadastroEvents('rooms', 'room', doc, resolveName));
    }

    const requesters = await db
      .collection<RequesterDocument>(COLLECTIONS.requesters)
      .find()
      .toArray();
    for (const doc of requesters) {
      inferred.push(...inferCadastroEvents('requesters', 'requester', doc, resolveName));
    }

    const absences = await db
      .collection<RequesterAbsenceDocument>(COLLECTIONS.requesterAbsences)
      .find()
      .toArray();
    for (const doc of absences) {
      inferred.push(...inferAbsenceEvents(doc, resolveName));
    }

    const reservations = await db
      .collection<ReservationDocument>(COLLECTIONS.reservations)
      .find()
      .toArray();
    for (const doc of reservations) {
      inferred.push(...inferReservationEvents(doc, resolveName));
    }

    for (const doc of users) {
      const event = inferUserRegisterEvent(doc);
      if (event) inferred.push(event);
    }

    const toInsert = inferred.filter((event) => !alreadyBackfilled(existing, event));
    const skipped = inferred.length - toInsert.length;

    console.log(
      `Inferidos: ${inferred.length} | Já existiam: ${skipped} | A gravar: ${toInsert.length}`,
    );

    if (!apply) {
      for (const event of toInsert.slice(0, 20)) {
        console.log(
          `  [dry] ${event.createdAt.toISOString()} ${event.action} #${event.entityId} (${event.actorName})`,
        );
      }
      if (toInsert.length > 20) {
        console.log(`  ... e mais ${toInsert.length - 20}`);
      }
      console.log('Dry-run concluído. Passe --apply para gravar.');
      return;
    }

    if (toInsert.length === 0) {
      console.log('Nada a gravar.');
      return;
    }

    const counters = db.collection<CounterDocument>(COLLECTIONS.counters);
    for (const event of toInsert) {
      const counter = await counters.findOneAndUpdate(
        { _id: COLLECTIONS.auditEvents },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' },
      );
      if (!counter) {
        throw new Error('Falha ao obter próximo id de auditEvents');
      }

      const document: AuditEventDocument = {
        _id: counter.seq,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        actorUserId: event.actorUserId,
        actorName: event.actorName,
        details: event.details,
        createdAt: event.createdAt,
      };
      await auditCol.insertOne(document);
    }

    console.log(`Gravados ${toInsert.length} eventos em ${COLLECTIONS.auditEvents}.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => reportAndExit('Falha no backfill de auditoria', error));
