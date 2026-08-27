import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../errors/domain-errors';
import { reasonPhrase } from './reason-phrase';

/** Mesma mensagem do fallback genérico do `GlobalExceptionHandler` do Java. */
const GENERIC_MESSAGE = 'Não foi possível concluir a operação. Verifique os dados informados.';

export interface ErrorResponseBody {
  status: number;
  error: string;
  message?: string;
  path?: string;
}

/**
 * Equivalente ao `GlobalExceptionHandler` do Spring. Devolve sempre o corpo
 * `{status, error, message, path}` que o frontend Angular sabe interpretar — ele lê
 * `message` primeiro e `error` como fallback.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const { status, message } = this.resolve(exception);

    const body: ErrorResponseBody = {
      status,
      error: reasonPhrase(status),
      path: request.originalUrl ?? request.url,
    };

    // O Java usa `default-property-inclusion=NON_NULL`: mensagem nula some do JSON.
    if (message) {
      body.message = message;
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): { status: number; message?: string } {
    if (exception instanceof DomainError) {
      return { status: exception.status, message: exception.message };
    }

    if (exception instanceof HttpException) {
      return { status: exception.getStatus(), message: this.messageFrom(exception) };
    }

    this.logger.error(
      exception instanceof Error ? exception.message : 'Erro não tratado',
      exception instanceof Error ? exception.stack : undefined,
    );

    // Erros inesperados não vazam detalhes internos, como no handler original.
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: GENERIC_MESSAGE };
  }

  private messageFrom(exception: HttpException): string | undefined {
    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return payload;
    }

    if (payload && typeof payload === 'object' && 'message' in payload) {
      const { message } = payload as { message?: unknown };
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
    }

    return exception.message;
  }
}
