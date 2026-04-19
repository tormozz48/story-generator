import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';

import { ImageAiService } from './image-ai.service';

@Module({
  imports: [StorageModule],
  providers: [ImageAiService],
  exports: [ImageAiService],
})
export class ImageAiModule {}
