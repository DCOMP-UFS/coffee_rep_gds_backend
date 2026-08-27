/**
 * Equivalente ao `@CPF` do Hibernate Validator: confere os dois dígitos verificadores e
 * rejeita as sequências de dígitos repetidos, que passam no cálculo mas não são válidas.
 */
export function isValidCpf(value: string | null | undefined): boolean {
  if (!value) return false;

  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  return (
    checkDigit(digits, 9) === Number(digits[9]) && checkDigit(digits, 10) === Number(digits[10])
  );
}

/** Soma ponderada decrescente do módulo 11, usada nos dois dígitos verificadores. */
function checkDigit(digits: string, length: number): number {
  let sum = 0;
  for (let index = 0; index < length; index++) {
    sum += Number(digits[index]) * (length + 1 - index);
  }

  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

/** Normaliza para os 11 dígitos, como o frontend já envia. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}
