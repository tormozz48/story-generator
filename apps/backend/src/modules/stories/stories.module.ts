import { Module } from '@nestjs/common';

import { GenerationModule } from '../generation/generation.module';
import { SafetyModule } from '../safety/safety.module';

import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [GenerationModule, SafetyModule],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
