import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { APP_CONFIG, AppConfig } from '@app/config/app-config'
import { UserModule } from '../user/user.module'
import { AuthController } from './controllers/auth.controller'
import { AuthService } from './services/auth.service'
import { AuthGuard } from './guards/auth.guard'
import { PermissionsGuard } from './guards/permissions.guard'
import { SessionService } from './services/session.service'

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.jwtSecret,
        signOptions: { algorithm: 'HS256', expiresIn: config.accessTokenTtl },
        verifyOptions: { algorithms: ['HS256'] }
      })
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    // Order matters: authenticate first, then check permissions.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard }
  ]
})
export class AuthModule {}
