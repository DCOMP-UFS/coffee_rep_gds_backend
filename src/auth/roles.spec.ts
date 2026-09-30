import { describe, expect, it } from 'vitest';
import {
  ROLE_ADMIN,
  ROLE_ASSISTANT,
  ROLE_BASIC,
  ROLE_COORDINATOR,
  ROLE_VIEWER,
  isRoleAbove,
  normalizeRole,
  resolveRole,
} from './roles';

describe('normalizeRole', () => {
  it('mantém os perfis da hierarquia nova', () => {
    for (const role of [ROLE_VIEWER, ROLE_ASSISTANT, ROLE_COORDINATOR, ROLE_ADMIN]) {
      expect(normalizeRole(role)).toBe(role);
    }
  });

  it('trata o BASIC legado como coordenação, preservando o acesso de antes da migração', () => {
    expect(normalizeRole(ROLE_BASIC)).toBe(ROLE_COORDINATOR);
  });

  it('ignora valores desconhecidos', () => {
    expect(normalizeRole('SUPERUSER')).toBeNull();
  });
});

describe('resolveRole', () => {
  it('usa o maior perfil reconhecido do array', () => {
    expect(resolveRole([ROLE_VIEWER, ROLE_COORDINATOR, ROLE_ASSISTANT])).toBe(ROLE_COORDINATOR);
  });

  it('cai no visualizador quando não há perfil reconhecido', () => {
    expect(resolveRole([])).toBe(ROLE_VIEWER);
    expect(resolveRole(null)).toBe(ROLE_VIEWER);
    expect(resolveRole(['DESCONHECIDO'])).toBe(ROLE_VIEWER);
  });

  it('resolve o BASIC legado como coordenação', () => {
    expect(resolveRole([ROLE_BASIC])).toBe(ROLE_COORDINATOR);
  });
});

describe('isRoleAbove', () => {
  it('segue a ordem visualizador < assistente < coordenação < admin', () => {
    expect(isRoleAbove(ROLE_ASSISTANT, ROLE_VIEWER)).toBe(true);
    expect(isRoleAbove(ROLE_COORDINATOR, ROLE_ASSISTANT)).toBe(true);
    expect(isRoleAbove(ROLE_ADMIN, ROLE_COORDINATOR)).toBe(true);
  });

  it('não considera o mesmo perfil nem um inferior como acima', () => {
    expect(isRoleAbove(ROLE_ASSISTANT, ROLE_ASSISTANT)).toBe(false);
    expect(isRoleAbove(ROLE_VIEWER, ROLE_COORDINATOR)).toBe(false);
  });
});
