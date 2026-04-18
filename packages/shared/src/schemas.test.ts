import { describe, it, expect } from 'vitest';

import { StoryGenerationRequestSchema } from './schemas.js';

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
