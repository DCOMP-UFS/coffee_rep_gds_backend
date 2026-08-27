import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto, LoginResponse, createUserSchema, loginSchema } from './dto/auth.dto';
import { Public } from './public.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(zodPipe(loginSchema)) dto: LoginDto): Promise<LoginResponse> {
    return this.authService.authenticate(dto);
  }

  /**
   * Rota pública, como no `SecurityConfig` do Java (`POST /api/auth/**`), e responde
   * 200 com corpo vazio — o frontend não lê nada da resposta.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  register(@Body(zodPipe(createUserSchema)) dto: CreateUserDto): Promise<void> {
    return this.authService.register(dto);
  }
}
