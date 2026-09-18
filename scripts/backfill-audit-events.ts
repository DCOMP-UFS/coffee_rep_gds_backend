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
    console.log(
      `Documentos lidos: sections=${sections.length}, rooms=${rooms.length}, requesters=${requesters.length}, absences=${absences.length}, reservations=${reservations.length}, users=${users.length}`,
    );
    printBreakdown('Por ação', toInsert.map((e) => e.action));
    printBreakdown(
      'Por origem (backfillSource)',
      toInsert.map((e) => String(e.details.backfillSource ?? '?')),
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
    const batchSize = 500;
    let written = 0;

    // Reserva um bloco de ids de uma vez (em vez de 1 round-trip por evento).
    const reserved = await counters.findOneAndUpdate(
      { _id: COLLECTIONS.auditEvents },
      { $inc: { seq: toInsert.length } },
      { upsert: true, returnDocument: 'after' },
    );
    if (!reserved) {
      throw new Error('Falha ao reservar ids de auditEvents');
    }
    let nextId = reserved.seq - toInsert.length + 1;

    console.log(`Gravando ${toInsert.length} eventos em lotes de ${batchSize}...`);

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const slice = toInsert.slice(i, i + batchSize);
      const documents: AuditEventDocument[] = slice.map((event) => {
        const document: AuditEventDocument = {
          _id: nextId,
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          actorUserId: event.actorUserId,
          actorName: event.actorName,
          details: event.details,
          createdAt: event.createdAt,
        };
        nextId += 1;
        return document;
      });

      await auditCol.insertMany(documents, { ordered: true });
      written += documents.length;
      const pct = ((written / toInsert.length) * 100).toFixed(1);
      console.log(`  ${written}/${toInsert.length} (${pct}%)`);
    }

    console.log(`Gravados ${written} eventos em ${COLLECTIONS.auditEvents}.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => reportAndExit('Falha no backfill de auditoria', error));

function printBreakdown(title: string, keys: string[]): void {
  const counts = new Map<string, number>();
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const lines = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  console.log(`${title}:`);
  for (const [key, count] of lines) {
    console.log(`  ${key}: ${count}`);
  }
}
