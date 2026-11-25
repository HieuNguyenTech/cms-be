import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { RequestWithUser } from '@app/common/decorators/current-user.decorator'
import { IS_PUBLIC_KEY } from '@app/common/decorators/public.decorator'
import { AuthService } from '../services/auth.service'

/** Global guard: every route requires a valid access token unless marked `@Public()`. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()]
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true

    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Authentication required')

    request.user = await this.authService.authenticate(token)
    return true
  }
}
