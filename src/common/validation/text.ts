/** Escapa metacaracteres para usar entrada do usuário dentro de um `$regex`. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `LIKE '%termo%'` case-insensitive, como as Specifications do Java. */
export function containsIgnoreCase(value: string): RegExp {
  return new RegExp(escapeRegex(value), 'i');
}

/** `LIKE '%termo%'` case-sensitive, como o SQL nativo de salas. */
export function contains(value: string): RegExp {
  return new RegExp(escapeRegex(value));
}

/** Igualdade case-insensitive, como `findByNameIgnoreCase`. */
export function equalsIgnoreCase(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value)}$`, 'i');
}

/** Converte string vazia ou só espaços em `null`, como o `normalize` do Java. */
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}
