import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { map, Observable } from 'rxjs'
import { Paginated } from '../pagination/pagination'

/** Success shape: `{ data }`, plus `meta` for paginated lists. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result: unknown) => {
        if (result instanceof Paginated) {
          const { items, total, page, limit } = result
          return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
        }
        return { data: result ?? null }
      })
    )
  }
}
