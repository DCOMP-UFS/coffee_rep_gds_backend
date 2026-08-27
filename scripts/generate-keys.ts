import { generateKeyPairSync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Gera um par RSA novo para assinar os JWTs. As chaves do backend Java estavam
 * versionadas no repositório, então não devem ser reaproveitadas.
 *
 * A saída vem em uma linha, com `\n` escapado, que é o formato aceito por arquivos
 * `.env` e pela interface de variáveis de ambiente da Vercel.
 *
 * Use `pnpm keys:generate --write` para gravar direto no `.env`, ou
 * `--write --env .env.atlas` para gravar em outro arquivo de ambiente.
 */
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const escape = (pem: string): string => pem.trim().replace(/\n/g, '\\n');

const entries = {
  JWT_PRIVATE_KEY: escape(privateKey),
  JWT_PUBLIC_KEY: escape(publicKey),
};

if (process.argv.includes('--write')) {
  const envIndex = process.argv.indexOf('--env');
  const envFile = envIndex >= 0 ? process.argv[envIndex + 1] : '.env';
  const envPath = resolve(process.cwd(), envFile);

  if (!existsSync(envPath)) {
    console.error(`Arquivo ${envFile} não encontrado. Copie o exemplo antes de usar --write.`);
    process.exit(1);
  }

  let content = readFileSync(envPath, 'utf8');

  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}="${value}"`;
    const existing = new RegExp(`^${key}=.*$`, 'm');
    content = existing.test(content) ? content.replace(existing, line) : `${content}\n${line}\n`;
  }

  writeFileSync(envPath, content, 'utf8');
  console.log(`Chaves RSA gravadas em ${envFile}.`);
} else {
  console.log('Copie as duas linhas abaixo para o seu .env:\n');
  for (const [key, value] of Object.entries(entries)) {
    console.log(`${key}="${value}"`);
  }
}
