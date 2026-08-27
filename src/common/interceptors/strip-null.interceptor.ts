import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Equivalente a `spring.jackson.default-property-inclusion=NON_NULL`: o backend Java
 * omite toda propriedade nula das respostas, e o frontend conta com isso (por exemplo,
 * uma reserva recorrente responde só `{requesterName, roomName, recurrenceId}`).
 */
@Injectable()
export class StripNullInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((payload) => stripNulls(payload)));
  }
}

export function stripNulls<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    // Elementos nulos dentro de arrays são preservados: o Jackson só omite propriedades.
    return value.map((item) => stripNulls(item)) as unknown as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === null || item === undefined) continue;
    result[key] = stripNulls(item);
  }
  return result as T;
}

/** Datas, Buffers e instâncias de classe são valores, não estruturas a percorrer. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
