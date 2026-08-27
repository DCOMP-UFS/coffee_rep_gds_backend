import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { JWTPayload, SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose';
import { ENV, Env } from '../config/env';

/** Mesmo emissor do backend Java, mantido para que tokens antigos sejam reconhecíveis. */
const ISSUER = 'GDS_backend';
const ALGORITHM = 'RS256';

export interface AccessTokenClaims extends JWTPayload {
  /** Id do usuário, como string. O Java usa o `subject` para isso. */
  sub: string;
  /** Nomes das roles separados por espaço, ex.: `"ADMIN"`. */
  scope: string;
}

@Injectable()
export class TokenService implements OnModuleInit {
  // O tipo de chave do `jose` varia conforme o runtime; deriva-se do próprio import.
  private privateKey!: Awaited<ReturnType<typeof importPKCS8>>;
  private publicKey!: Awaited<ReturnType<typeof importSPKI>>;

  constructor(@Inject(ENV) private readonly env: Env) {}

  async onModuleInit(): Promise<void> {
    this.privateKey = await importPKCS8(this.env.JWT_PRIVATE_KEY, ALGORITHM);
    this.publicKey = await importSPKI(this.env.JWT_PUBLIC_KEY, ALGORITHM);
  }

  /** Reproduz os claims emitidos pelo `AuthService` do Java. */
  async sign(userId: number, roles: string[]): Promise<{ token: string; expiresIn: number }> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresIn = this.env.EXPIRATION_TIME;

    const token = await new SignJWT({ scope: roles.join(' ') })
      .setProtectedHeader({ alg: ALGORITHM })
      .setIssuer(ISSUER)
      .setSubject(String(userId))
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + expiresIn)
      .sign(this.privateKey);

    return { token, expiresIn };
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    const { payload } = await jwtVerify(token, this.publicKey, {
      issuer: ISSUER,
      algorithms: [ALGORITHM],
    });

    return {
      ...payload,
      sub: String(payload.sub ?? ''),
      scope: typeof payload.scope === 'string' ? payload.scope : '',
    };
  }
}
