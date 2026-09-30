import { MongoClient } from 'mongodb';
import { assertRemoteWriteConfirmed, loadEnvFile, maskUri, reportAndExit } from './load-env.js';
import { loadEnv } from '../src/config/env';
import {
  MigrationUser,
  applyRoleMigration,
  inspectRoleMigration,
} from '../src/role-requests/role-migration';

/**
 * Migra os perfis do modelo antigo (ADMIN/BASIC) para a hierarquia nova: quem é BASIC
 * vira COORDINATOR, o ADMIN único é conferido e os índices de `roleRequests` são criados.
 *
 *   pnpm db:migrate-roles                            # dry-run (padrão)
 *   pnpm db:migrate-roles --apply                    # grava no banco do .env
 *   pnpm db:migrate-roles --env .env.atlas --apply --yes   # grava no Atlas
 */
async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const envFile = loadEnvFile();
  const env = loadEnv();

  console.log(`Ambiente: ${envFile}`);
  console.log(`Destino:  ${maskUri(env.MONGO_URI)} (banco "${env.MONGO_DB}")`);
  console.log(`Modo:     ${apply ? 'APPLY (grava)' : 'DRY-RUN (não grava)'}`);

  if (apply) {
    assertRemoteWriteConfirmed(env.MONGO_URI, 'altera os perfis dos usuários (BASIC vira COORDINATOR)');
  }

  const client = new MongoClient(env.MONGO_URI);
  await client.connect();

  try {
    const db = client.db(env.MONGO_DB);
    const report = await inspectRoleMigration(db);

    printUsers('ADMIN encontrado(s)', report.admins);
    printUsers('BASIC que virarão COORDINATOR', report.legacyUsers);
    for (const warning of report.warnings) {
      console.warn(`AVISO: ${warning}`);
    }

    if (!apply) {
      console.log('\nDry-run concluído. Passe --apply para gravar.');
      return;
    }

    const { converted } = await applyRoleMigration(db);
    console.log(`\nUsuários convertidos: ${converted}. Índices de roleRequests garantidos.`);
  } finally {
    await client.close();
  }
}

function printUsers(title: string, users: MigrationUser[]): void {
  console.log(`\n${title}: ${users.length}`);
  for (const user of users) {
    console.log(`  #${user.id} ${user.name ?? '(sem nome)'} <${user.email ?? 'sem e-mail'}>`);
  }
}

main().catch((error) => reportAndExit('Falha na migração de perfis', error));
