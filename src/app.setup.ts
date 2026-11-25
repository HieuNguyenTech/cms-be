import fastifyHelmet from '@fastify/helmet'
import { ValidationPipe } from '@nestjs/common'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { APP_CONFIG, AppConfig } from './config/app-config'

/** Global HTTP behaviour, shared by the server and the end-to-end tests. */
export async function setupApp(app: NestFastifyApplication): Promise<void> {
  const config = app.get<AppConfig>(APP_CONFIG)

  app.setGlobalPrefix('api')

  // The content security policy would block the Swagger UI, which only runs outside production.
  await app.register(fastifyHelmet, config.isProduction ? {} : { contentSecurityPolicy: false })
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  })

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  app.useGlobalInterceptors(new ResponseInterceptor())
  app.useGlobalFilters(new AllExceptionsFilter())
  app.enableShutdownHooks()

  if (!config.isProduction) {
    const document = new DocumentBuilder().setTitle('CMS API').addBearerAuth().build()
    SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, document))
  }
}
