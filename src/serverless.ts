import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { ENV, type Env } from './config/env';

/**
 * Entrypoint para execução como função serverless.
 *
 * Diferente do `main.ts`, aqui a aplicação **não** abre uma porta: a plataforma é quem
 * recebe a requisição e a entrega ao handler do Express. Por isso usamos `app.init()` no
 * lugar de `app.listen()`.
 *
 * A instância é memoizada porque uma mesma função atende várias invocações enquanto está
 * "quente". Sem isso, cada requisição reconstruiria todo o container de injeção do Nest e
 * abriria uma nova conexão com o Mongo.
 */
let cachedServer: Promise<Express> | undefined;

async function createServer(): Promise<Express> {
  const expressApp = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
  });

  configureApp(app, app.get<Env>(ENV));
  await app.init();

  return expressApp;
}

export function getServer(): Promise<Express> {
  // A promessa é guardada antes de resolver, para que invocações concorrentes durante a
  // inicialização a fio compartilhem o mesmo bootstrap em vez de dispararem outro.
  cachedServer ??= createServer().catch((error: unknown) => {
    cachedServer = undefined;
    throw error;
  });

  return cachedServer;
}
