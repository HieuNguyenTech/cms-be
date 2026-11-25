import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ContactController } from './controllers/contact.controller'
import { Contact, ContactSchema } from './schemas/contact.schema'
import { ContactService } from './services/contact.service'

@Module({
  imports: [MongooseModule.forFeature([{ name: Contact.name, schema: ContactSchema }])],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService]
})
export class ContactModule {}
