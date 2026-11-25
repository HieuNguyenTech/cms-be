import { ValidateIf } from 'class-validator'

/**
 * The field may be omitted, but may not be `null`.
 * (class-validator's `IsOptional` also accepts `null`, which would erase stored data.)
 */
export const IsOmittable = () => ValidateIf((_, value) => value !== undefined)
