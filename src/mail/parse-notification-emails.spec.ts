import { describe, expect, it } from 'vitest';
import { parseNotificationEmails } from './parse-notification-emails';

describe('parseNotificationEmails', () => {
  it('separa por vírgula e remove espaços', () => {
    expect(parseNotificationEmails(' a@x.com , b@y.com ')).toEqual(['a@x.com', 'b@y.com']);
  });

  it('descarta endereços inválidos e itens vazios', () => {
    expect(parseNotificationEmails('a@x.com,,invalido, @x.com,b@y')).toEqual(['a@x.com']);
  });

  it('remove repetidos ignorando maiúsculas, mantendo a primeira grafia', () => {
    expect(parseNotificationEmails('Admin@X.com,admin@x.com')).toEqual(['Admin@X.com']);
  });

  it('devolve lista vazia sem valor', () => {
    expect(parseNotificationEmails(undefined)).toEqual([]);
    expect(parseNotificationEmails('')).toEqual([]);
  });
});
