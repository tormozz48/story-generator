import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

export const MINIO_CLIENT = Symbol('MINIO_CLIENT');

@Module({
  providers: [
    {
      provide: MINIO_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Client({
          endPoint: config.getOrThrow<string>('MINIO_ENDPOINT'),
          port: config.get<number>('MINIO_PORT', 9000),
          useSSL: config.get<boolean>('MINIO_USE_SSL', false),
          accessKey: config.getOrThrow<string>('MINIO_ACCESS_KEY'),
          secretKey: config.getOrThrow<string>('MINIO_SECRET_KEY'),
        });
      },
    },
  ],
  exports: [MINIO_CLIENT],
})
export class StorageModule implements OnModuleInit {
  private readonly logger = new Logger(StorageModule.name);

  constructor(private readonly config: ConfigService) {}

  // Injected via module provider — stored separately for health check
  private minioClient?: Client;

  async onModuleInit() {
    // Health check: verify MinIO is reachable by listing buckets
    try {
      const client = new Client({
        endPoint: this.config.getOrThrow<string>('MINIO_ENDPOINT'),
        port: this.config.get<number>('MINIO_PORT', 9000),
        useSSL: this.config.get<boolean>('MINIO_USE_SSL', false),
        accessKey: this.config.getOrThrow<string>('MINIO_ACCESS_KEY'),
        secretKey: this.config.getOrThrow<string>('MINIO_SECRET_KEY'),
      });
      const bucket = this.config.get<string>('MINIO_BUCKET', 'story-generator');
      const exists = await client.bucketExists(bucket);
      if (!exists) {
        await client.makeBucket(bucket);
        this.logger.log(`Created MinIO bucket: ${bucket}`);
      }
      this.logger.log('MinIO connection verified');
      this.minioClient = client;
    } catch (err) {
      this.logger.error('MinIO health check failed', err);
      throw err;
    }
  }
}
