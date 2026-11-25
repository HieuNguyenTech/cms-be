import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { APP_CONFIG, AppConfig } from '@app/config/app-config'

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({ uri: config.mongodbUri, serverSelectionTimeoutMS: 10_000 })
    })
  ]
})
export class DatabaseModule {}
