import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { BadCredentialsError, EntityAlreadyExistsError } from '../common/errors/domain-errors';
import { BadParametersError } from '../common/errors/domain-errors';
import { nowWallClock, parseLocalDate } from '../common/date/local-date-time';
import { ROLE_BASIC, STATUS_ACTIVE } from '../database/documents';
import { UsersRepository } from '../users/users.repository';
import { CreateUserDto, LoginDto, LoginResponse } from './dto/auth.dto';
import { TokenService } from './token.service';

/** Custo do BCrypt usado pelo Spring Security, mantido para não encarecer o login. */
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly tokens: TokenService,
  ) {}

  /**
   * O login é feito por CPF, não por e-mail. Assim como no Java, `status` do usuário
   * não é verificado aqui — ver `docs/BUGS-HERDADOS.md`.
   */
  async authenticate(dto: LoginDto): Promise<LoginResponse> {
    const user = dto.cpf ? await this.users.findByCpf(dto.cpf) : null;

    if (!user?.password || !dto.password || !(await compare(dto.password, user.password))) {
      throw new BadCredentialsError();
    }

    const { token, expiresIn } = await this.tokens.sign(user._id, user.roles);
    return { accessToken: token, expiresIn };
  }

  async register(dto: CreateUserDto): Promise<void> {
    if (await this.users.findByCpf(dto.cpf)) {
      throw new EntityAlreadyExistsError('Este CPF já está cadastrado.');
    }

    if (await this.users.findByEmail(dto.email)) {
      throw new EntityAlreadyExistsError('Este e-mail já está cadastrado.');
    }

    const birthDate = parseLocalDate(dto.birthDate);
    if (!birthDate) {
      throw new BadParametersError('O formato da data de aniversário deve ser [yyyy-MM-dd].');
    }

    await this.users.insert({
      name: dto.name,
      phone: dto.phone,
      password: await hash(dto.password, BCRYPT_ROUNDS),
      cpf: dto.cpf,
      email: dto.email,
      birthDate,
      roles: [ROLE_BASIC],
      status: STATUS_ACTIVE,
      createdAt: nowWallClock(),
      updatedAt: null,
      updatedBy: null,
    });
  }
}
