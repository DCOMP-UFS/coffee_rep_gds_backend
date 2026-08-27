import { DomainError } from '../common/errors/domain-errors';

/**
 * Token ausente, inválido ou expirado. No Java isso é tratado pelo filtro do Spring
 * Security, que responde 401 com corpo vazio; aqui o corpo segue o mesmo `ErrorResponse`
 * das demais falhas, o que o frontend também entende (ele usa a mensagem padrão quando
 * não reconhece o payload) e facilita o diagnóstico.
 */
export class UnauthenticatedError extends DomainError {
  readonly status = 401;

  constructor(message = 'Credenciais ausentes ou inválidas.') {
    super(message);
  }
}
