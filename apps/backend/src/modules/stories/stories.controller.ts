import { Body, Controller, Post, Req, UsePipes } from '@nestjs/common';
import { StoryGenerationRequestSchema } from '@story-generator/shared';
import type { StoryGenerationRequest } from '@story-generator/shared';
import type { Request } from 'express';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { StoriesService } from './stories.service';

@Controller('stories')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(StoryGenerationRequestSchema))
  async create(@Body() dto: StoryGenerationRequest, @Req() req: Request) {
    // Anonymous browser UUID from cookie; nullable for Week 1
    const ownerId = (req.cookies?.['browserId'] as string | undefined) ?? null;
    return this.stories.create(dto, ownerId);
  }
}
