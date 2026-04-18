import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { GenerationProgressEvent } from '@story-generator/shared';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import Redis from 'ioredis';

import * as schema from '../../db/schema';
import { DRIZZLE } from '../database/database.module';
import { REDIS_CLIENT, jobProgressChannel } from '../redis/redis.module';
import { SafetyService } from '../safety/safety.service';
import { UnsafePromptError } from '../safety/unsafe-prompt.error';
import { TextAiService } from '../text-ai/text-ai.service';

import { GENERATION_QUEUE, GENERATE_STORY_JOB } from './generation.constants';

type GenerateStoryPayload = {
  storyId: string;
  prompt: string;
  targetLength: number;
  style: string;
};

@Processor(GENERATION_QUEUE)
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly safety: SafetyService,
    private readonly textAi: TextAiService
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== GENERATE_STORY_JOB) return;

    const { storyId, prompt, targetLength } = job.data as GenerateStoryPayload;
    const jobId = job.id ?? storyId;

    this.logger.log(`Processing generation job ${jobId} for story ${storyId}`);

    try {
      // 1. Safety check
      await this.emit(jobId, storyId, 'planning', 10, 'Проверка безопасности…');
      this.safety.checkPrompt(prompt);

      // 2. Planning step
      await this.emit(jobId, storyId, 'planning', 20, 'Составляем план истории…');
      const plan = await this.textAi.plan(prompt);

      // Persist title and plan
      await this.db
        .update(schema.stories)
        .set({ title: plan.title, plan, status: 'writing', updatedAt: new Date() })
        .where(eq(schema.stories.id, storyId));

      // 3. Story writing
      await this.emit(jobId, storyId, 'writing', 50, 'Пишем историю…');
      const generatedText = await this.textAi.writeStory(plan, targetLength);

      // 4. ImageAi — no-op pass-through (Week 3)
      // (imaging step skipped, progress jumps to 90)

      // 5. Persist completed story
      await this.db
        .update(schema.stories)
        .set({ generatedText, status: 'done', updatedAt: new Date() })
        .where(eq(schema.stories.id, storyId));

      // 6. Done
      await this.emit(jobId, storyId, 'done', 100, 'Готово!');
      this.logger.log(`Generation job ${jobId} completed`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isUnsafe = err instanceof UnsafePromptError;

      this.logger.error(`Generation job ${jobId} failed: ${message}`);

      await this.db
        .update(schema.stories)
        .set({ status: 'failed', errorMessage: message, updatedAt: new Date() })
        .where(eq(schema.stories.id, storyId))
        .catch(() => undefined); // don't mask original error

      await this.emit(
        jobId,
        storyId,
        'failed',
        0,
        isUnsafe ? 'Запрос заблокирован фильтром безопасности' : 'Ошибка генерации'
      );

      // Re-throw so BullMQ records the failure
      throw err;
    }
  }

  private async emit(
    jobId: string,
    storyId: string,
    status: GenerationProgressEvent['status'],
    progress: number,
    message?: string
  ): Promise<void> {
    const event: GenerationProgressEvent = { jobId, status, progress, message };
    try {
      await this.redis.publish(jobProgressChannel(jobId), JSON.stringify(event));
    } catch (err) {
      // Non-fatal: log and continue — SSE will show stale state
      this.logger.warn(`Failed to publish progress event for job ${jobId}: ${String(err)}`);
    }

    // Also keep story status in sync in DB
    if (status !== 'done' && status !== 'failed') {
      await this.db
        .update(schema.stories)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.stories.id, storyId))
        .catch(() => undefined);
    }
  }
}
