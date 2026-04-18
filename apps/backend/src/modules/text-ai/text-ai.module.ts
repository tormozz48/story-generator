import { Module } from '@nestjs/common';

import { TextAiService } from './text-ai.service';

@Module({
  providers: [TextAiService],
  exports: [TextAiService],
})
export class TextAiModule {}
