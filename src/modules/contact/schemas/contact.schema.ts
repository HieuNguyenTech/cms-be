import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export enum ContactStatus {
  New = 'new',
  InProgress = 'in_progress',
  Resolved = 'resolved'
}

@Schema({ timestamps: true, versionKey: false })
export class Contact {
  createdAt: Date
  updatedAt: Date

  @Prop({ required: true, trim: true, maxlength: 150 })
  name: string

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 254 })
  email: string

  @Prop({ trim: true, maxlength: 30 }) phone?: string
  @Prop({ trim: true, maxlength: 200 }) company?: string

  @Prop({ required: true, trim: true, maxlength: 100 }) subject: string
  @Prop({ required: true, trim: true, maxlength: 5000 }) message: string

  @Prop({ enum: ContactStatus, default: ContactStatus.New, index: true }) status: ContactStatus
  @Prop({ trim: true, maxlength: 2000 }) note?: string
}

export type ContactDocument = HydratedDocument<Contact>
export const ContactSchema = SchemaFactory.createForClass(Contact)
