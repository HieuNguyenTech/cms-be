import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { IsPassword } from '../../user/dto/is-password.decorator'

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  refreshToken: string
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  currentPassword: string

  @IsPassword()
  newPassword: string
}
