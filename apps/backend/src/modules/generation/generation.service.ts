import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { GENERATE_STORY_JOB, GENERATION_QUEUE } from './generation.constants';

export type EnqueueResult = { jobId: string };

@Injectable()
export class GenerationService {
  constructor(@InjectQueue(GENERATION_QUEUE) private readonly queue: Queue) {}

  async enqueueGeneration(
    storyId: string,
    payload: Record<string, unknown>
  ): Promise<EnqueueResult> {
    const job = await this.queue.add(GENERATE_STORY_JOB, { storyId, ...payload });
    return { jobId: job.id ?? storyId };
  }
}
