import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Controller()
export class HealthController {
  /**
   * Público e barato de propósito: o `APP_INITIALIZER` do Angular chama este endpoint
   * na abertura do app para aquecer a função e disfarçar o cold start.
   */
  @Public()
  @Get('api/health')
  health(): { status: string } {
    return { status: 'UP' };
  }

  @Public()
  @Get('hello')
  hello(): string {
    return 'Hello World!';
  }
}
