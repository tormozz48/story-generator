import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { GENERATION_QUEUE } from './generation.constants';
import { GenerationProcessor } from './generation.processor';
import { GenerationService } from './generation.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: GENERATION_QUEUE,
    }),
  ],
  providers: [GenerationService, GenerationProcessor],
  exports: [GenerationService],
})
export class GenerationModule {}
