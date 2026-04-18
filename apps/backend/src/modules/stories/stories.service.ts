import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { StoryGenerationRequest } from '@story-generator/shared';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../../db/schema';
import { DRIZZLE } from '../database/database.module';
import { GenerationService } from '../generation/generation.service';
import { SafetyService } from '../safety/safety.service';
import { UnsafePromptError } from '../safety/unsafe-prompt.error';

export type CreateStoryResult = { storyId: string; jobId: string };

@Injectable()
export class StoriesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly generation: GenerationService,
    private readonly safety: SafetyService
  ) {}

  async create(dto: StoryGenerationRequest, ownerId: string | null): Promise<CreateStoryResult> {
    // Run safety check at the HTTP boundary so blocked prompts return 422, not 500
    try {
      this.safety.checkPrompt(dto.prompt);
    } catch (err) {
      if (err instanceof UnsafePromptError) {
        throw new UnprocessableEntityException({
          error: 'unsafe_prompt',
          message: err.message,
        });
      }
      throw err;
    }

    const [story] = await this.db
      .insert(schema.stories)
      .values({
        ownerId,
        prompt: dto.prompt,
        targetLength: dto.targetLength,
        style: dto.style,
        status: 'queued',
      })
      .returning({ id: schema.stories.id });

    const { jobId } = await this.generation.enqueueGeneration(story.id, {
      prompt: dto.prompt,
      targetLength: dto.targetLength,
      style: dto.style,
    });

    await this.db.update(schema.stories).set({ jobId }).where(eq(schema.stories.id, story.id));

    return { storyId: story.id, jobId };
  }

  async findOne(id: string) {
    const [story] = await this.db
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.id, id))
      .limit(1);

    if (!story) {
      throw new NotFoundException(`Story ${id} not found`);
    }

    return {
      id: story.id,
      ownerId: story.ownerId,
      prompt: story.prompt,
      title: story.title,
      status: story.status,
      targetLength: story.targetLength,
      style: story.style,
      jobId: story.jobId,
      generatedText: story.generatedText,
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
    };
  }
}
