import { z } from 'zod';

export const StoryStyleSchema = z.enum([
  'photorealistic',
  'anime',
  'painterly',
  'illustration',
  'comic',
]);

export type StoryStyle = z.infer<typeof StoryStyleSchema>;

export const StoryLengthSchema = z
  .number()
  .int()
  .min(500, 'Story must be at least 500 words')
  .max(10000, 'Story cannot exceed 10 000 words');

export const StoryGenerationRequestSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(2000, 'Prompt cannot exceed 2000 characters'),
  targetLength: StoryLengthSchema.default(2000),
  style: StoryStyleSchema.default('photorealistic'),
});

export type StoryGenerationRequest = z.infer<typeof StoryGenerationRequestSchema>;

export const StoryGenerationResponseSchema = z.object({
  storyId: z.string().uuid(),
  jobId: z.string(),
});

export type StoryGenerationResponse = z.infer<typeof StoryGenerationResponseSchema>;
