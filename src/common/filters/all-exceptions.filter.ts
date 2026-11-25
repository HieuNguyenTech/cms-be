import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { FastifyReply } from 'fastify'

/** One error shape for the whole API. Internal error details are logged, never returned. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>()
    const { status, message } = this.describe(exception)

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception))
    }

    void reply.status(status).send({
      data: null,
      error: { code: this.errorCode(status), status, message },
      meta: null
    })
  }

  private errorCode(status: number): string {
    return HttpStatus[status] ?? 'HTTP_ERROR'
  }

  private describe(exception: unknown): { status: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse()
      const message = typeof body === 'string' ? body : (body as { message?: string | string[] }).message
      return { status: exception.getStatus(), message: message ?? exception.message }
    }

    // Client errors raised by Fastify itself (bad JSON, payload too large, ...)
    const { statusCode, message } = (exception ?? {}) as { statusCode?: number; message?: string }
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return { status: statusCode, message: message ?? 'Bad request' }
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' }
  }
}
