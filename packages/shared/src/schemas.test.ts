import { describe, it, expect } from 'vitest';

import { StoryGenerationRequestSchema, StoryPlanSchema, GenerationProgressEventSchema } from './schemas.js';

describe('StoryGenerationRequestSchema', () => {
  it('accepts a valid request', () => {
    const result = StoryGenerationRequestSchema.safeParse({
      prompt: 'A romantic story set in Moscow',
      targetLength: 2000,
      style: 'photorealistic',
    });
    expect(result.success).toBe(true);
  });

  it('applies defaults for optional fields', () => {
    const result = StoryGenerationRequestSchema.safeParse({
      prompt: 'A romantic story set in Moscow',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetLength).toBe(2000);
      expect(result.data.style).toBe('photorealistic');
    }
  });

  it('rejects a too-short prompt', () => {
    const result = StoryGenerationRequestSchema.safeParse({ prompt: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid style', () => {
    const result = StoryGenerationRequestSchema.safeParse({
      prompt: 'A romantic story set in Moscow',
      style: 'watercolor',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a length below minimum', () => {
    const result = StoryGenerationRequestSchema.safeParse({
      prompt: 'A romantic story set in Moscow',
      targetLength: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe('StoryPlanSchema', () => {
  const validPlan = {
    title: 'Ночная встреча',
    characterSheet: 'Анна, 24 года, брюнетка',
    styleDescription: 'Реалистичный стиль',
    sceneOutline: ['Сцена 1', 'Сцена 2'],
    imagePrompts: ['prompt 1', 'prompt 2'],
  };

  it('accepts a valid plan', () => {
    expect(StoryPlanSchema.safeParse(validPlan).success).toBe(true);
  });

  it('rejects plan with empty sceneOutline', () => {
    expect(StoryPlanSchema.safeParse({ ...validPlan, sceneOutline: [] }).success).toBe(false);
  });

  it('rejects plan with empty imagePrompts', () => {
    expect(StoryPlanSchema.safeParse({ ...validPlan, imagePrompts: [] }).success).toBe(false);
  });

  it('rejects plan missing title', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { title: _t, ...rest } = validPlan;
    expect(StoryPlanSchema.safeParse(rest).success).toBe(false);
  });
});

describe('GenerationProgressEventSchema', () => {
  it('accepts a valid event', () => {
    const result = GenerationProgressEventSchema.safeParse({
      jobId: 'job-123',
      status: 'planning',
      progress: 20,
      message: 'Составляем план…',
    });
    expect(result.success).toBe(true);
  });

  it('rejects progress out of range', () => {
    expect(
      GenerationProgressEventSchema.safeParse({ jobId: 'j', status: 'done', progress: 150 }).success
    ).toBe(false);
  });

  it('rejects invalid status', () => {
    expect(
      GenerationProgressEventSchema.safeParse({ jobId: 'j', status: 'unknown', progress: 50 }).success
    ).toBe(false);
  });
});
