import { hash } from 'bcryptjs';
import { MongoClient } from 'mongodb';
import { loadEnvFile, maskUri, reportAndExit } from './load-env.js';
import { loadEnv } from '../src/config/env';
import {
  COLLECTIONS,
  CounterDocument,
  ROLE_ADMIN,
  STATUS_ACTIVE,
  UserDocument,
} from '../src/database/documents';
import { nowWallClock, parseLocalDate } from '../src/common/date/local-date-time';

/**
 * Equivalente ao `AdminUserConfig` do Java, que era um `CommandLineRunner`.
 *
 * Virou script de CLI porque na Vercel a aplicação roda como função serverless: um hook
 * de boot seria reexecutado a cada cold start. Continua idempotente — se já existir um
 * usuário com o CPF configurado, nada é alterado (inclusive a senha, como no original).
 */
const ADMIN_EMAIL = 'admin@admin.com';

async function main(): Promise<void> {
  const envFile = loadEnvFile();
  const env = loadEnv();

  console.log(`Ambiente: ${envFile}`);
  console.log(`Destino:  ${maskUri(env.MONGO_URI)} (banco "${env.MONGO_DB}")`);

  const client = new MongoClient(env.MONGO_URI);
  await client.connect();

  try {
    const db = client.db(env.MONGO_DB);
    const users = db.collection<UserDocument>(COLLECTIONS.users);

    // O e-mail entra na checagem além do CPF porque ele é único no banco: sem isso, uma
    // base migrada que já tenha admin@admin.com faria o script quebrar com erro de índice.
    const existing = await users.findOne({
      $or: [{ cpf: env.ADMIN_CPF }, { email: ADMIN_EMAIL }],
    });

    if (existing) {
      console.log(
        `Admin já existe (id ${existing._id}, CPF ${existing.cpf}, e-mail ${existing.email}). Nada a fazer.`,
      );
      return;
    }

    const counter = await db
      .collection<CounterDocument>(COLLECTIONS.counters)
      .findOneAndUpdate(
        { _id: COLLECTIONS.users },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' },
      );

    const admin: UserDocument = {
      _id: counter!.seq,
      name: 'Admin',
      password: await hash(env.ADMIN_PASSWORD, 10),
      email: ADMIN_EMAIL,
      cpf: env.ADMIN_CPF,
      phone: '79999999999',
      birthDate: parseLocalDate('1995-01-01'),
      status: STATUS_ACTIVE,
      roles: [ROLE_ADMIN],
      createdAt: nowWallClock(),
      updatedAt: null,
      updatedBy: null,
    };

    await users.insertOne(admin);
    console.log(`Admin criado (id ${admin._id}, CPF ${env.ADMIN_CPF}).`);
  } finally {
    await client.close();
  }
}

main().catch((error) => reportAndExit('Falha ao criar o admin', error));
