import { INestApplication } from '@nestjs/common';
import { Env } from './config/env';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { StripNullInterceptor } from './common/interceptors/strip-null.interceptor';

/**
 * Configuração compartilhada entre o entrypoint de produção e os testes de integração,
 * para que os testes exerçam exatamente o mesmo pipeline da aplicação real — é o que dá
 * valor às asserções sobre formato de resposta.
 */
export function configureApp(app: INestApplication, env: Env): void {
  app.enableCors({
    origin: env.CORS_ORIGINS.includes('*') ? true : env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: '*',
    credentials: false,
  });

  app.useGlobalInterceptors(new StripNullInterceptor());
  app.useGlobalFilters(new DomainExceptionFilter());
}
