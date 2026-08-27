/**
 * Erros de domínio equivalentes às exceções do backend Java. Os status HTTP são os
 * do `GlobalExceptionHandler` original e fogem da convenção de propósito: o frontend
 * depende deles, então não devem ser "corrigidos" sem alinhar o Angular junto.
 */
export abstract class DomainError extends Error {
  abstract readonly status: number;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Java: `EntityNotFoundException` → 400 Bad Request (não 404). */
export class EntityNotFoundError extends DomainError {
  readonly status = 400;

  constructor(message: string) {
    super(message);
  }
}

/** Java: `EntityAlreadyExistsException` → 400 Bad Request (não 409). */
export class EntityAlreadyExistsError extends DomainError {
  readonly status = 400;

  constructor(message: string) {
    super(message);
  }
}

/** Java: `BadParametersException` → 406 Not Acceptable. */
export class BadParametersError extends DomainError {
  readonly status = 406;

  constructor(message: string) {
    super(message);
  }
}

/** Java: `BadCredentialsException` → 401 Unauthorized. */
export class BadCredentialsError extends DomainError {
  readonly status = 401;

  constructor(message = 'Invalid username or password') {
    super(message);
  }
}

/** Java: `AuthorizationDeniedException` → 403 Forbidden. */
export class AuthorizationDeniedError extends DomainError {
  readonly status = 403;

  constructor(message = 'Access Denied') {
    super(message);
  }
}

/**
 * Java: `MethodArgumentNotValidException` e `MissingServletRequestParameterException` → 400.
 * O handler original expõe apenas a primeira mensagem de erro, não uma lista.
 */
export class ValidationError extends DomainError {
  readonly status = 400;

  constructor(message: string) {
    super(message);
  }
}
