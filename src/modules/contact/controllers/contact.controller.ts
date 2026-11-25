import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Public } from '@app/common/decorators/public.decorator'
import { RequirePermissions } from '@app/common/decorators/require-permissions.decorator'
import { Paginated, PaginationQueryDto } from '@app/common/pagination/pagination'
import { ParseObjectIdPipe } from '@app/common/validation/parse-object-id.pipe'
import { CONTACT_PERMISSIONS } from '../contact.permissions'
import { CreateContactDto, UpdateContactDto } from '../dto/contact.dto'
import { ContactResponse } from '../dto/contact.response'
import { ContactService } from '../services/contact.service'

@ApiTags('contacts')
@Controller('contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  async create(@Body() dto: CreateContactDto): Promise<ContactResponse> {
    return ContactResponse.from(await this.contactService.create(dto))
  }

  @ApiBearerAuth() @Get() @RequirePermissions(CONTACT_PERMISSIONS.Read)
  async list(@Query() query: PaginationQueryDto): Promise<Paginated<ContactResponse>> {
    return (await this.contactService.paginate(query)).map(ContactResponse.from)
  }

  @ApiBearerAuth() @Get(':id') @RequirePermissions(CONTACT_PERMISSIONS.Read)
  async get(@Param('id', ParseObjectIdPipe) id: string): Promise<ContactResponse> {
    return ContactResponse.from(await this.contactService.findById(id))
  }

  @ApiBearerAuth() @Patch(':id') @RequirePermissions(CONTACT_PERMISSIONS.Manage)
  async update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateContactDto): Promise<ContactResponse> {
    return ContactResponse.from(await this.contactService.update(id, dto))
  }

  @ApiBearerAuth() @Delete(':id') @RequirePermissions(CONTACT_PERMISSIONS.Manage)
  delete(@Param('id', ParseObjectIdPipe) id: string): Promise<void> { return this.contactService.delete(id) }
}
