import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { envSchema } from './common/env.schema';
import { HealthController } from './health.controller';
import { DatabaseModule } from './modules/database/database.module';
import { GenerationModule } from './modules/generation/generation.module';
import { ImageAiModule } from './modules/image-ai/image-ai.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { RedisModule } from './modules/redis/redis.module';
import { SafetyModule } from './modules/safety/safety.module';
import { StorageModule } from './modules/storage/storage.module';
import { StoriesModule } from './modules/stories/stories.module';
import { TextAiModule } from './modules/text-ai/text-ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          throw new Error(`Invalid environment variables:\n${result.error.toString()}`);
        }
        return result.data;
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 3_600_000),
          limit: config.get<number>('THROTTLE_LIMIT', 10),
        },
      ],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    DatabaseModule,
    RedisModule,
    StorageModule,
    SafetyModule,
    TextAiModule,
    ImageAiModule,
    GenerationModule,
    StoriesModule,
    JobsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
