import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { AuthUser } from '@app/common/auth/auth-user'
import { APP_CONFIG, AppConfig } from '@app/config/app-config'
import { hashPassword, verifyPassword } from '../../user/services/password'
import { UserService } from '../../user/services/user.service'
import { ChangePasswordDto, LoginDto } from '../dto/auth.dto'
import { TokenResponse } from '../dto/token.response'
import { SessionService } from './session.service'

interface AccessTokenPayload {
  sub: string
  sid: string
}

@Injectable()
export class AuthService {
  /** Compared against when the email is unknown, so response time does not reveal which emails exist. */
  private readonly dummyHash = hashPassword('timing-protection-only')

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  async login({ email, password }: LoginDto): Promise<TokenResponse> {
    const user = await this.userService.findByEmailWithPassword(email)
    const matches = await verifyPassword(password, user?.passwordHash ?? (await this.dummyHash))
    if (!user || !matches || user.disabled) {
      throw new UnauthorizedException('Invalid email or password')
    }

    const userId = user.id as string
    const { sessionId, refreshToken } = await this.sessionService.create({
      userId,
      version: user.sessionVersion
    })
    return this.tokens(userId, sessionId, refreshToken)
  }

  async refresh(token: string): Promise<TokenResponse> {
    const found = await this.sessionService.consumeRefreshToken(token)
    if (found) {
      const { sessionId, session } = found
      const active = await this.userService.findActiveWithRoles(session.userId)
      if (active && active.user.sessionVersion === session.version) {
        const refreshToken = await this.sessionService.renew(sessionId)
        if (refreshToken) return this.tokens(session.userId, sessionId, refreshToken)
      }
    }
    throw new UnauthorizedException('Invalid or expired refresh token')
  }

  /** Resolves an access token to a user with up-to-date roles. */
  async authenticate(accessToken: string): Promise<AuthUser> {
    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken).catch(() => null)
    const session = payload && (await this.sessionService.find(payload.sid))
    const active = session && (await this.userService.findActiveWithRoles(session.userId))

    if (!payload || !session || !active || active.user.sessionVersion !== session.version) {
      throw new UnauthorizedException('Invalid or expired access token')
    }

    return {
      id: session.userId,
      email: active.user.email,
      name: active.user.name,
      sessionId: payload.sid,
      ...active.access
    }
  }

  logout(user: AuthUser): Promise<void> {
    return this.sessionService.end(user.sessionId)
  }

  /** Signs out every session of the user, including the current one. */
  async changePassword(actor: AuthUser, { currentPassword, newPassword }: ChangePasswordDto): Promise<void> {
    const user = await this.userService.findByIdWithPassword(actor.id)
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect')
    }
    await this.userService.changePassword(actor.id, newPassword)
  }

  private async tokens(userId: string, sessionId: string, refreshToken: string): Promise<TokenResponse> {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId }
    return {
      tokenType: 'Bearer',
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn: this.config.accessTokenTtl,
      refreshToken
    }
  }
}
