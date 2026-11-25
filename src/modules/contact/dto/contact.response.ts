import { ContactDocument, ContactStatus } from '../schemas/contact.schema'

export class ContactResponse {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  subject: string
  message: string
  status: ContactStatus
  note?: string
  createdAt: Date
  updatedAt: Date

  static from(contact: ContactDocument): ContactResponse {
    return {
      id: contact.id, name: contact.name, email: contact.email, phone: contact.phone,
      company: contact.company, subject: contact.subject, message: contact.message,
      status: contact.status, note: contact.note, createdAt: contact.createdAt, updatedAt: contact.updatedAt
    }
  }
}
