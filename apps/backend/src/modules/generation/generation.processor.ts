import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { GENERATION_QUEUE, GENERATE_STORY_JOB } from './generation.constants';

@Processor(GENERATION_QUEUE)
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);

  async process(job: Job): Promise<void> {
    if (job.name !== GENERATE_STORY_JOB) return;

    const { storyId } = job.data as { storyId: string };
    this.logger.log(`Processing generation job ${job.id} for story ${storyId}`);

    // TODO: Week 2 — SafetyModule.checkPrompt → TextAiModule.plan → TextAiModule.writeStory
    // TODO: Week 3 — ImageAiModule.generateReferencePortrait → generateSceneImages
    // TODO: Week 3 — persist results to Postgres + MinIO, publish SSE progress events

    this.logger.log(`Generation job ${job.id} completed (stub)`);
  }
}
