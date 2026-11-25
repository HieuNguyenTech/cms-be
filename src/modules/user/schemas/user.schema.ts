import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
import { Role } from '../../role/schemas/role.schema'

@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email: string

  @Prop({ type: String, required: true, trim: true })
  name: string

  @Prop({ type: String, required: true, select: false })
  passwordHash: string

  @Prop({ type: [{ type: Types.ObjectId, ref: Role.name }], default: [], index: true })
  roles: Types.ObjectId[]

  @Prop({ type: Boolean, default: false })
  disabled: boolean

  /** Increases on password change or disable. Sessions of older versions are rejected. */
  @Prop({ type: Number, default: 0 })
  sessionVersion: number
}

export type UserDocument = HydratedDocument<User>
export const UserSchema = SchemaFactory.createForClass(User)
