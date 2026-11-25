import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'auth:public'

/** Opens a route to anonymous visitors. Every route without it requires login. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
