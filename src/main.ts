import 'reflect-metadata';
import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { ENV, Env } from './config/env';

/**
 * Entrypoint para execução como servidor tradicional: desenvolvimento local, Docker ou
 * qualquer host com processo de longa duração. Na Vercel quem responde é `api/index.js`,
 * que usa `serverless.ts` e não abre porta nenhuma.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const env = app.get<Env>(ENV);

  configureApp(app, env);

  await app.listen(env.PORT);
  Logger.log(`API disponível em http://localhost:${env.PORT}`, 'Bootstrap');
}

void bootstrap();
