import { z } from 'zod';

/** Lista separada por vírgula, com default aplicado antes da divisão. */
const csv = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),

  MONGO_URI: z.string().min(1),
  MONGO_DB: z.string().min(1).default('coffee_gds_db'),

  /** Origens permitidas no CORS. Espelha `cors.origins` do backend Java. */
  CORS_ORIGINS: csv('http://localhost:5173,http://localhost:4200'),

  /** Chaves RSA em PEM. Ficam em variável de ambiente porque o filesystem da Vercel é somente leitura. */
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),

  /** Validade do token em segundos. Mesmo default do perfil de produção do Java. */
  EXPIRATION_TIME: z.coerce.number().int().positive().default(86_400),

  ADMIN_CPF: z.string().min(1).default('17055661030'),
  ADMIN_PASSWORD: z.string().min(1).default('1234'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * As chaves PEM não sobrevivem a uma variável de ambiente de linha única, então
 * aceitamos `\n` escapado — formato usado tanto pela Vercel quanto por arquivos `.env`.
 */
function restoreNewlines(value: string | undefined): string | undefined {
  return value?.replace(/\\n/g, '\n');
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse({
    ...source,
    JWT_PRIVATE_KEY: restoreNewlines(source.JWT_PRIVATE_KEY),
    JWT_PUBLIC_KEY: restoreNewlines(source.JWT_PUBLIC_KEY),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${issues}`);
  }

  return parsed.data;
}

export const ENV = Symbol('ENV');
