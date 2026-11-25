import { applyDecorators } from '@nestjs/common'
import { IsByteLength, IsString } from 'class-validator'

/** bcrypt only reads the first 72 bytes of a password, so longer ones are rejected. */
export const PASSWORD_BYTES = { min: 12, max: 72 }

export const IsPassword = () =>
  applyDecorators(IsString(), IsByteLength(PASSWORD_BYTES.min, PASSWORD_BYTES.max))
