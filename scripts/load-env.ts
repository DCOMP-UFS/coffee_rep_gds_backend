import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carrega variáveis de ambiente do arquivo indicado por `--env <arquivo>`, ou de `.env`.
 *
 * Existe para que os scripts de CLI possam apontar para ambientes diferentes sem editar
 * o `.env` local a cada execução — em especial para rodar a migração contra o Atlas sem
 * perder a configuração do Mongo em Docker.
 */
/**
 * Erro de uso do script (ambiente ausente, alvo não confirmado). Diferente de uma falha
 * inesperada, não vale mostrar stack trace: a mensagem já diz o que fazer.
 */
export class ScriptUsageError extends Error {}

/** Imprime o erro de forma adequada ao tipo e encerra o processo. */
export function reportAndExit(context: string, error: unknown): never {
  if (error instanceof ScriptUsageError) {
    console.error(`\n${error.message}\n`);
  } else {
    console.error(`${context}:`, error);
  }
  process.exit(1);
}

export function loadEnvFile(): string {
  const index = process.argv.indexOf('--env');
  const file = index >= 0 ? process.argv[index + 1] : '.env';

  if (!file) {
    throw new ScriptUsageError('A opção --env exige o caminho de um arquivo, ex.: --env .env.atlas');
  }

  const path = resolve(process.cwd(), file);

  if (!existsSync(path)) {
    throw new ScriptUsageError(`Arquivo de ambiente não encontrado: ${path}`);
  }

  config({ path, quiet: true });
  return file;
}

/** Esconde a senha antes de exibir a URI de conexão em log. */
export function maskUri(uri: string): string {
  return uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');
}

/**
 * A migração apaga cada coleção antes de inserir. Contra o Mongo local isso é rotina;
 * contra um cluster remoto seria destrutivo por acidente, então o alvo remoto exige
 * confirmação explícita com `--yes`.
 */
export function assertDestructiveTargetAllowed(uri: string): void {
  const isLocal = /(@|\/\/)(localhost|127\.0\.0\.1)(:|\/)/.test(uri);

  if (isLocal || process.argv.includes('--yes')) {
    return;
  }

  throw new ScriptUsageError(
    `O destino não é local:\n  ${maskUri(uri)}\n\n` +
      'Esta operação APAGA todas as coleções antes de inserir.\n' +
      'Se for mesmo isso que você quer, repita o comando acrescentando --yes.',
  );
}
