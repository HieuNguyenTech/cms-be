import { Transform } from 'class-transformer'
import { ArrayUnique, IsArray, IsIn, IsString, Length, Matches } from 'class-validator'
import { IsOmittable } from '@app/common/validation/is-omittable.decorator'
import { ALL_PERMISSIONS } from '../../permissions'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CreateRoleDto {
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name: string

  /** Stable identifier, cannot be changed later. */
  @Matches(/^[a-z][a-z0-9_-]{1,49}$/)
  slug: string

  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permissions: string[]
}

export class UpdateRoleDto {
  @IsOmittable()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name?: string

  @IsOmittable()
  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permissions?: string[]
}
