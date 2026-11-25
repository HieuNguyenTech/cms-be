import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export const SUPER_ADMIN_SLUG = 'super_admin'

@Schema({ timestamps: true, versionKey: false })
export class Role {
  @Prop({ type: String, required: true, trim: true })
  name: string

  @Prop({ type: String, required: true, unique: true, immutable: true })
  slug: string

  @Prop({ type: [String], default: [] })
  permissions: string[]

  /** System roles cannot be edited or deleted. */
  @Prop({ type: Boolean, default: false, immutable: true })
  isSystem: boolean
}

export type RoleDocument = HydratedDocument<Role>
export const RoleSchema = SchemaFactory.createForClass(Role)
