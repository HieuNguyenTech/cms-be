import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { hasPermissions } from '@app/common/auth/access-policy'
import type { RequestWithUser } from '@app/common/decorators/current-user.decorator'
import { PERMISSIONS_KEY } from '@app/common/decorators/require-permissions.decorator'

/** Global guard, runs after `AuthGuard`. Enforces `@RequirePermissions()`. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()]
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, targets)
    if (!required?.length) return true

    const { user } = context.switchToHttp().getRequest<RequestWithUser>()
    if (!user || !hasPermissions(user, required)) {
      throw new ForbiddenException('You do not have permission to do this')
    }
    return true
  }
}
