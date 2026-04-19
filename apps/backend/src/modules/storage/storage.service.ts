import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

import { MINIO_CLIENT } from './storage.constants';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(
    @Inject(MINIO_CLIENT) private readonly minio: Client,
    private readonly config: ConfigService
  ) {
    this.bucket = config.get<string>('MINIO_BUCKET', 'story-generator');
    const publicUrl = config.get<string>('MINIO_PUBLIC_URL', 'http://localhost:9000');
    this.publicBaseUrl = `${publicUrl}/${this.bucket}`;
  }

  /**
   * Downloads an image from sourceUrl and uploads it to MinIO under the given key.
   * Returns the browser-accessible public URL for the stored object.
   */
  async uploadImageFromUrl(sourceUrl: string, key: string): Promise<string> {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch image from ${sourceUrl}: ${res.status}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') ?? 'image/png';

    await this.minio.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });

    this.logger.log(`Uploaded image to MinIO: ${key} (${buffer.length} bytes)`);
    return this.getObjectUrl(key);
  }

  /**
   * Returns the browser-accessible public URL for an object key.
   */
  getObjectUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  /**
   * Reads an object from MinIO and returns it as a base64 data URI.
   * Use this when the public URL is not reachable from external services (e.g. localhost).
   */
  async getObjectAsDataUrl(key: string, contentType = 'image/png'): Promise<string> {
    const stream = await this.minio.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const b64 = Buffer.concat(chunks).toString('base64');
    return `data:${contentType};base64,${b64}`;
  }
}
