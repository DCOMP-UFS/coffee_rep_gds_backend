import 'reflect-metadata';

import { INestApplication, Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { generateKeyPairSync } from 'node:crypto';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { AuthModule } from '../../src/auth/auth.module';
import { configureApp } from '../../src/bootstrap';
import { ENV, Env, loadEnv } from '../../src/config/env';
import { MongoModule } from '../../src/database/mongo.module';
import { MONGO_DB } from '../../src/database/mongo.tokens';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

export interface TestApp {
  app: INestApplication;
  db: Db;
  close: () => Promise<void>;
}

/**
 * Sobe a aplicação contra um MongoDB em memória, aplicando exatamente o mesmo
 * `configureApp` do entrypoint de produção. Sem isso, as asserções sobre formato de
 * resposta (envelope de paginação, omissão de nulos, corpo de erro) não provariam nada
 * sobre o comportamento real.
 */
export async function createTestApp(modules: Type<unknown>[]): Promise<TestApp> {
  const mongo = await MongoMemoryServer.create();

  const env: Env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
    MONGO_URI: mongo.getUri(),
    MONGO_DB: 'gds_test',
    JWT_PRIVATE_KEY: privateKey,
    JWT_PUBLIC_KEY: publicKey,
    EXPIRATION_TIME: '86400',
  } as NodeJS.ProcessEnv);

  const moduleRef = await Test.createTestingModule({
    imports: [MongoModule, AuthModule, ...modules],
    providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
  })
    .overrideProvider(ENV)
    .useValue(env)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app, env);
  await app.init();

  const db = app.get<Db>(MONGO_DB);

  return {
    app,
    db,
    close: async () => {
      await app.close();
      await mongo.stop();
    },
  };
}
