import { Transform } from 'class-transformer'
import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator'
import { ContactStatus } from '../schemas/contact.schema'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CreateContactDto {
  @Transform(trim) @IsString() @Length(1, 150) name: string
  @Transform(trim) @IsEmail() @MaxLength(254) email: string
  @Transform(trim) @IsOptional() @IsString() @MaxLength(30) phone?: string
  @Transform(trim) @IsOptional() @IsString() @MaxLength(200) company?: string
  @Transform(trim) @IsString() @Length(1, 100) subject: string
  @Transform(trim) @IsString() @Length(1, 5000) message: string
}

export class UpdateContactDto {
  @IsOptional() @IsIn(Object.values(ContactStatus)) status?: ContactStatus
  @Transform(trim) @IsOptional() @IsString() @MaxLength(2000) note?: string
}
