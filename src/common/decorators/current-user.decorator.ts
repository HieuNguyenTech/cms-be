import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { AuthUser } from '../auth/auth-user'

export type RequestWithUser = FastifyRequest & { user?: AuthUser }

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthUser => {
  return context.switchToHttp().getRequest<RequestWithUser>().user!
})
