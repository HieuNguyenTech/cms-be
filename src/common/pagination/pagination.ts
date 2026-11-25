import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20
}

export class Paginated<T> {
  constructor(
    readonly items: T[],
    readonly total: number,
    readonly page: number,
    readonly limit: number
  ) {}

  map<R>(mapper: (item: T) => R): Paginated<R> {
    return new Paginated(this.items.map(mapper), this.total, this.page, this.limit)
  }
}
