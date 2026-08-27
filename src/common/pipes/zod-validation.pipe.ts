import { PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';
import { ValidationError } from '../errors/domain-errors';

/**
 * Equivalente ao `@Valid` do Spring. O `GlobalExceptionHandler` original expõe
 * **apenas a primeira** mensagem de erro (`getFieldErrors().get(0)`), nunca uma lista,
 * e o comportamento é replicado aqui.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    return result.data;
  }
}

/** Açúcar para usar em `@Body(zodBody(schema))` e `@Query(zodBody(schema))`. */
export function zodPipe<T>(schema: ZodType<T>): ZodValidationPipe<T> {
  return new ZodValidationPipe(schema);
}
