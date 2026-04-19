import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

import { MINIO_CLIENT } from './storage.constants';
import { StorageService } from './storage.service';

export { MINIO_CLIENT };

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
    StorageService,
  ],
  exports: [MINIO_CLIENT, StorageService],
})
export class StorageModule implements OnModuleInit {
  private readonly logger = new Logger(StorageModule.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    // Health check: verify MinIO is reachable and ensure public bucket exists
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

      // Make bucket publicly readable so frontend can display images without presigned URLs
      const publicPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      });
      await client.setBucketPolicy(bucket, publicPolicy);
      this.logger.log('MinIO connection verified, bucket policy set to public read');
    } catch (err) {
      this.logger.error('MinIO health check failed', err);
      throw err;
    }
  }
}
