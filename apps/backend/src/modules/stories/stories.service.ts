import { Inject, Injectable } from '@nestjs/common';
import type { StoryGenerationRequest } from '@story-generator/shared';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../../db/schema';
import { DRIZZLE } from '../database/database.module';
import { GenerationService } from '../generation/generation.service';

export type CreateStoryResult = { storyId: string; jobId: string };

@Injectable()
export class StoriesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly generation: GenerationService
  ) {}

  async create(dto: StoryGenerationRequest, ownerId: string | null): Promise<CreateStoryResult> {
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
}
