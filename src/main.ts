import { existsSync } from 'node:fs'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'
import { setupApp } from './app.setup'
import { loadConfig } from './config/app-config'

async function bootstrap() {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const config = loadConfig()

  // The built-in Fastify logger writes one structured line per request, with a request id.
  const adapter = new FastifyAdapter({ logger: true, trustProxy: config.trustProxy })
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter)
  await setupApp(app)
  await app.listen(config.port, '0.0.0.0')

  new Logger('Bootstrap').log(`Listening on port ${config.port}`)
}

bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
