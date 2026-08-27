import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { ENV, Env, loadEnv } from '../config/env';
import { CountersService } from './counters.service';
import { MONGO_CLIENT, MONGO_DB } from './mongo.tokens';

/**
 * Cache em escopo de módulo. Na Vercel a aplicação roda como função serverless e uma
 * mesma instância atende várias invocações: reconectar a cada requisição esgotaria o
 * limite de conexões do Atlas.
 */
let cachedClient: Promise<MongoClient> | null = null;

export function connectMongo(env: Env): Promise<MongoClient> {
  if (!cachedClient) {
    cachedClient = new MongoClient(env.MONGO_URI, {
      // Pool pequeno porque a escala vem de novas instâncias da função, não de threads.
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10_000,
    })
      .connect()
      .catch((error) => {
        cachedClient = null;
        throw error;
      });
  }
  return cachedClient;
}

@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: () => loadEnv() },
    {
      provide: MONGO_CLIENT,
      inject: [ENV],
      useFactory: (env: Env) => connectMongo(env),
    },
    {
      provide: MONGO_DB,
      inject: [MONGO_CLIENT, ENV],
      useFactory: (client: MongoClient, env: Env) => client.db(env.MONGO_DB),
    },
    CountersService,
  ],
  exports: [ENV, MONGO_CLIENT, MONGO_DB, CountersService],
})
export class MongoModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    const client = cachedClient;
    cachedClient = null;
    await (await client)?.close();
  }
}

export { MONGO_CLIENT, MONGO_DB };
