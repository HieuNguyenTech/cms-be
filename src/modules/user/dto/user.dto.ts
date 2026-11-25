import { Transform } from 'class-transformer'
import { ArrayUnique, IsArray, IsBoolean, IsEmail, IsMongoId, IsString, Length } from 'class-validator'
import { IsOmittable } from '@app/common/validation/is-omittable.decorator'
import { IsPassword } from './is-password.decorator'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class SetUserRolesDto {
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  roleIds: string[]
}

export class CreateUserDto extends SetUserRolesDto {
  @Transform(trim)
  @IsEmail()
  email: string

  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name: string

  @IsPassword()
  password: string
}

export class UpdateUserDto {
  @IsOmittable()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name?: string

  @IsOmittable()
  @IsPassword()
  password?: string

  @IsOmittable()
  @IsBoolean()
  disabled?: boolean
}
