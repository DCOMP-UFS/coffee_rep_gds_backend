import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';
import { assertDestructiveTargetAllowed, loadEnvFile, maskUri, reportAndExit } from './load-env.js';
import { parsePgDump, toDate, toInt, toText, type PgRow } from './pg-dump-parser.js';

const ENV_FILE = loadEnvFile();

const MONGO_URI =
  process.env.MONGO_URI ?? 'mongodb://gds:gds@localhost:27018/coffee_gds_db?authSource=admin';
const DUMP_PATH = resolve(process.cwd(), process.env.DUMP_PATH ?? '../db-backup/gestao-salas-dump.sql');
const DB_NAME = process.env.MONGO_DB ?? 'coffee_gds_db';

/**
 * Mantemos os ids numéricos do Postgres como `_id` no Mongo. Isso preserva o contrato
 * da API (o frontend já trabalha com ids numéricos) e dispensa uma tabela de/para.
 * A coleção `counters` assume o papel das sequences para novos documentos.
 */
type Doc = Record<string, unknown>;

type Counter = { _id: string; seq: number };

function auditFields(row: PgRow): Doc {
  return {
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    updatedBy: toInt(row.updated_by),
  };
}

function buildUsers(rows: PgRow[], userRoles: PgRow[], roles: PgRow[]): Doc[] {
  const roleNameById = new Map(roles.map((r) => [toInt(r.role_id), toText(r.name)]));
  const rolesByUser = new Map<number, string[]>();
  for (const link of userRoles) {
    const userId = toInt(link.user_id);
    const roleName = roleNameById.get(toInt(link.role_id));
    if (userId === null || !roleName) continue;
    rolesByUser.set(userId, [...(rolesByUser.get(userId) ?? []), roleName]);
  }

  return rows.map((row) => {
    const id = toInt(row.user_id)!;
    return {
      _id: id,
      name: toText(row.name),
      email: toText(row.email),
      cpf: toText(row.cpf),
      password: row.password,
      phone: toText(row.phone),
      birthDate: toDate(row.birth_date),
      status: toInt(row.status),
      roles: rolesByUser.get(id) ?? [],
      ...auditFields(row),
    };
  });
}

function buildSections(rows: PgRow[]): Doc[] {
  return rows.map((row) => ({
    _id: toInt(row.id)!,
    name: toText(row.name),
    observations: toText(row.observations),
    status: toInt(row.status),
    ...auditFields(row),
  }));
}

function buildRooms(rows: PgRow[]): Doc[] {
  return rows.map((row) => ({
    _id: toInt(row.id)!,
    name: toText(row.name),
    status: toInt(row.status),
    sectionId: toInt(row.section_id),
    ...auditFields(row),
  }));
}

function buildRequesters(rows: PgRow[]): Doc[] {
  return rows.map((row) => ({
    _id: toInt(row.id)!,
    name: toText(row.name),
    contactNumber: toText(row.contact_number),
    specialty: toText(row.specialty),
    status: toInt(row.status),
    ...auditFields(row),
  }));
}

function buildRequesterAbsences(rows: PgRow[]): Doc[] {
  return rows.map((row) => ({
    _id: toInt(row.id)!,
    requesterId: toInt(row.requester_id),
    startDate: toDate(row.start_date),
    endDate: toDate(row.end_date),
    ...auditFields(row),
  }));
}

function buildReservations(rows: PgRow[]): Doc[] {
  return rows.map((row) => ({
    _id: toInt(row.id)!,
    startDate: toDate(row.start_date),
    endDate: toDate(row.end_date),
    observations: toText(row.observations),
    roomId: toInt(row.room_id),
    requesterId: toInt(row.requester_id),
    status: toInt(row.status),
    recurrenceId: toInt(row.recurrence_id),
    ...auditFields(row),
  }));
}

async function main(): Promise<void> {
  assertDestructiveTargetAllowed(MONGO_URI);

  console.log(`Ambiente: ${ENV_FILE}`);
  console.log(`Destino:  ${maskUri(MONGO_URI)} (banco "${DB_NAME}")`);
  console.log(`Lendo dump: ${DUMP_PATH}`);
  const tables = await parsePgDump(DUMP_PATH);
  const table = (name: string): PgRow[] => tables.get(name) ?? [];

  const collections: Record<string, Doc[]> = {
    users: buildUsers(table('tb_users'), table('tb_users_roles'), table('tb_roles')),
    sections: buildSections(table('tb_sections')),
    rooms: buildRooms(table('tb_rooms')),
    requesters: buildRequesters(table('tb_requesters')),
    requesterAbsences: buildRequesterAbsences(table('tb_requester_absence')),
    reservations: buildReservations(table('tb_reservations')),
  };

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  try {
    const db = client.db(DB_NAME);

    for (const [name, docs] of Object.entries(collections)) {
      await db.collection(name).deleteMany({});
      if (docs.length > 0) {
        await db.collection(name).insertMany(docs, { ordered: false });
      }
      console.log(`${name}: ${docs.length} documentos`);
    }

    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true, name: 'uniq_email' },
      { key: { cpf: 1 }, unique: true, name: 'uniq_cpf' },
    ]);
    await db.collection('sections').createIndex({ name: 1 }, { unique: true, name: 'uniq_name' });
    await db.collection('rooms').createIndex({ sectionId: 1, name: 1 }, { name: 'by_section_name' });
    await db.collection('requesters').createIndex({ name: 1 }, { name: 'by_name' });
    await db.collection('requesterAbsences').createIndex(
      { requesterId: 1, startDate: 1 },
      { name: 'by_requester_period' },
    );
    await db.collection('reservations').createIndexes([
      { key: { roomId: 1, startDate: 1, endDate: 1 }, name: 'by_room_period' },
      { key: { requesterId: 1, startDate: 1 }, name: 'by_requester_period' },
      { key: { recurrenceId: 1 }, name: 'by_recurrence' },
    ]);

    // Substitui as sequences do Postgres: guarda o maior id usado por coleção.
    const counters: Counter[] = Object.entries(collections).map(([name, docs]) => ({
      _id: name,
      seq: docs.reduce((max, doc) => Math.max(max, Number(doc._id)), 0),
    }));
    // O `recurrenceId` das reservas era um `MAX + 1` sem lock no Java; aqui vira um
    // contador atômico, e por isso precisa começar do maior valor já usado.
    counters.push({
      _id: 'recurrences',
      seq: collections.reservations.reduce(
        (max, doc) => Math.max(max, Number(doc.recurrenceId ?? 0)),
        0,
      ),
    });

    const countersCollection = db.collection<Counter>('counters');
    await countersCollection.deleteMany({});
    if (counters.length > 0) {
      await countersCollection.insertMany(counters);
    }

    console.log('Migração concluída.');
  } finally {
    await client.close();
  }
}

main().catch((error) => reportAndExit('Falha na migração', error));
