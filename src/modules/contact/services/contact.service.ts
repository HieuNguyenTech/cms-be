import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Paginated, PaginationQueryDto } from '@app/common/pagination/pagination'
import { CreateContactDto, UpdateContactDto } from '../dto/contact.dto'
import { Contact, ContactDocument } from '../schemas/contact.schema'

@Injectable()
export class ContactService {
  constructor(@InjectModel(Contact.name) private readonly contactModel: Model<Contact>) {}

  async paginate({ page, limit }: PaginationQueryDto): Promise<Paginated<ContactDocument>> {
    const [items, total] = await Promise.all([
      this.contactModel.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      this.contactModel.countDocuments().exec()
    ])
    return new Paginated(items, total, page, limit)
  }

  create(dto: CreateContactDto): Promise<ContactDocument> { return this.contactModel.create(dto) }

  async findById(id: string): Promise<ContactDocument> {
    const contact = await this.contactModel.findById(id).exec()
    if (!contact) throw new NotFoundException('Contact request not found')
    return contact
  }

  async update(id: string, dto: UpdateContactDto): Promise<ContactDocument> {
    const contact = await this.findById(id)
    contact.set(dto)
    return contact.save()
  }

  async delete(id: string): Promise<void> {
    const result = await this.contactModel.deleteOne({ _id: id }).exec()
    if (!result.deletedCount) throw new NotFoundException('Contact request not found')
  }
}
