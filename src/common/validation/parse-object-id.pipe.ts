import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import { isMongoId } from 'class-validator'

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isMongoId(value)) throw new BadRequestException('Invalid id')
    return value
  }
}
