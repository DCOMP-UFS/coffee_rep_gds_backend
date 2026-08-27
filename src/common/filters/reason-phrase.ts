/**
 * O campo `error` do `ErrorResponse` do Java é sempre o reason phrase HTTP em inglês
 * (`HttpStatus.getReasonPhrase()`). O frontend usa esse campo como fallback quando
 * `message` está ausente, então os textos precisam bater.
 */
const REASON_PHRASES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  409: 'Conflict',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

export function reasonPhrase(status: number): string {
  return REASON_PHRASES[status] ?? 'Internal Server Error';
}
