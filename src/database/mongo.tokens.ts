/**
 * Tokens de injeção em arquivo próprio para evitar ciclo de importação: o módulo
 * declara os providers e os providers precisam dos tokens. Num ciclo, o token chegaria
 * como `undefined` no decorator `@Inject` e o Nest não resolveria a dependência.
 */
export const MONGO_CLIENT = Symbol('MONGO_CLIENT');
export const MONGO_DB = Symbol('MONGO_DB');
