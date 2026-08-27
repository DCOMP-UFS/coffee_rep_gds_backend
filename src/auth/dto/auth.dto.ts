import { z } from 'zod';
import { isValidCpf } from '../../common/validation/cpf';

/**
 * O `LoginRequest` do Java **não** tem `@Valid` nem constraints: credenciais ausentes
 * caem na verificação de senha e resultam em 401, não em 400. O schema abaixo preserva
 * isso aceitando qualquer string.
 */
export const loginSchema = z.object({
  cpf: z.string().nullish(),
  password: z.string().nullish(),
});

export type LoginDto = z.infer<typeof loginSchema>;

/** Espelha as constraints do `CreateUserDto`, incluindo as mensagens de erro. */
export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'must not be blank'),
  phone: z.string().trim().min(1, 'must not be blank'),
  password: z.string().min(1, 'must not be blank'),
  email: z.string().min(1, 'must not be blank').email('must be a well-formed email address'),
  cpf: z
    .string()
    .min(1, 'must not be blank')
    .refine((value) => isValidCpf(value), 'invalid Brazilian individual taxpayer registry number'),
  /** String, e não data: o Java faz o parse manualmente e devolve 406 se o formato não bater. */
  birthDate: z.string().min(1, 'must not be blank'),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
}
