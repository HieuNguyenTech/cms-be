import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { minutes, Throttle } from '@nestjs/throttler'
import type { AuthUser } from '@app/common/auth/auth-user'
import { CurrentUser } from '@app/common/decorators/current-user.decorator'
import { Public } from '@app/common/decorators/public.decorator'
import { AuthService } from '../services/auth.service'
import { ChangePasswordDto, LoginDto, RefreshTokenDto } from '../dto/auth.dto'
import { TokenResponse } from '../dto/token.response'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: minutes(1), limit: 10 } })
  login(@Body() dto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(dto)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: minutes(1), limit: 20 } })
  refresh(@Body() { refreshToken }: RefreshTokenDto): Promise<TokenResponse> {
    return this.authService.refresh(refreshToken)
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser): Omit<AuthUser, 'sessionId'> {
    const { id, email, name, isSuperAdmin, permissions } = user
    return { id, email, name, isSuperAdmin, permissions }
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: AuthUser): Promise<void> {
    return this.authService.logout(user)
  }

  @ApiBearerAuth()
  @Put('password')
  @Throttle({ default: { ttl: minutes(1), limit: 5 } })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.authService.changePassword(user, dto)
  }
}
