import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { UNKNOWN_ACTOR_NAME } from '../audit/audit.types';
import { BadCredentialsError, EntityAlreadyExistsError } from '../common/errors/domain-errors';
import { BadParametersError } from '../common/errors/domain-errors';
import { nowWallClock, parseLocalDate } from '../common/date/local-date-time';
import { STATUS_ACTIVE } from '../database/documents';
import { UsersRepository } from '../users/users.repository';
import { AuthenticatedUser } from './current-user';
import { CreateUserDto, CurrentUserResponse, LoginDto, LoginResponse } from './dto/auth.dto';
import { permissionsFor } from './permissions';
import { ROLE_VIEWER } from './roles';
import { TokenService } from './token.service';
import { UnauthenticatedError } from './unauthenticated.error';

/** Custo do BCrypt usado pelo Spring Security, mantido para não encarecer o login. */
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
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

    await this.audit.record({
      action: 'auth.login',
      entityType: 'user',
      entityId: user._id,
      actorUserId: user._id,
      actorName: user.name?.trim() || UNKNOWN_ACTOR_NAME,
      details: { role: user.roles[0] ?? null },
    });

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

    const created = await this.users.insert({
      name: dto.name,
      phone: dto.phone,
      password: await hash(dto.password, BCRYPT_ROUNDS),
      cpf: dto.cpf,
      email: dto.email,
      birthDate,
      // Todo cadastro nasce com o menor nível; mais acesso só por pedido aprovado.
      roles: [ROLE_VIEWER],
      status: STATUS_ACTIVE,
      createdAt: nowWallClock(),
      updatedAt: null,
      updatedBy: null,
    });

    await this.audit.record({
      action: 'auth.register',
      entityType: 'user',
      entityId: created._id,
      actorUserId: created._id,
      actorName: created.name?.trim() || dto.name,
      details: { email: created.email },
    });
  }

  /** O perfil já vem resolvido do banco pelo `JwtAuthGuard`. */
  async me(authenticated: AuthenticatedUser): Promise<CurrentUserResponse> {
    const user = await this.users.findById(authenticated.userId);
    if (!user) {
      throw new UnauthenticatedError();
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: authenticated.role,
      permissions: permissionsFor(authenticated.role),
    };
  }
}
