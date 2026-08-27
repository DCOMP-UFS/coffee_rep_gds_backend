import { describe, expect, it } from 'vitest';
import { isValidCpf } from './cpf';

describe('isValidCpf', () => {
  it('aceita os CPFs que já existem na base migrada', () => {
    // Admin, Rafaela e Brenda, vindos do dump do GCP.
    expect(isValidCpf('17145992990')).toBe(true);
    expect(isValidCpf('78095815543')).toBe(true);
    expect(isValidCpf('30577082426')).toBe(true);
  });

  it('aceita o CPF do admin de desenvolvimento', () => {
    expect(isValidCpf('17055661030')).toBe(true);
  });

  it('aceita CPF formatado com máscara', () => {
    expect(isValidCpf('171.459.929-90')).toBe(true);
  });

  it('rejeita dígito verificador incorreto', () => {
    expect(isValidCpf('17145992991')).toBe(false);
  });

  it('rejeita sequências de dígitos repetidos, como o Hibernate Validator', () => {
    expect(isValidCpf('00000000000')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('99999999999')).toBe(false);
  });

  it('rejeita comprimento inválido e valores ausentes', () => {
    expect(isValidCpf('123456789')).toBe(false);
    expect(isValidCpf('')).toBe(false);
    expect(isValidCpf(null)).toBe(false);
  });
});
