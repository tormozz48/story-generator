import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ImageAiModule } from '../image-ai/image-ai.module';
import { SafetyModule } from '../safety/safety.module';
import { TextAiModule } from '../text-ai/text-ai.module';

import { GENERATION_QUEUE } from './generation.constants';
import { GenerationProcessor } from './generation.processor';
import { GenerationService } from './generation.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: GENERATION_QUEUE,
    }),
    SafetyModule,
    TextAiModule,
    ImageAiModule,
  ],
  providers: [GenerationService, GenerationProcessor],
  exports: [GenerationService],
})
export class GenerationModule {}
