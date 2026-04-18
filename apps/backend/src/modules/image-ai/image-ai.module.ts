import { Module } from '@nestjs/common';

import { ImageAiService } from './image-ai.service';

@Module({
  providers: [ImageAiService],
  exports: [ImageAiService],
})
export class ImageAiModule {}
