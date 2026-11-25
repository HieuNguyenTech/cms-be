import { ConflictException } from '@nestjs/common'

/** Turns a unique index violation into a 409 response. */
export async function rejectDuplicate<T>(operation: PromiseLike<T>, message: string): Promise<T> {
  try {
    return await operation
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new ConflictException(message)
    throw error
  }
}
