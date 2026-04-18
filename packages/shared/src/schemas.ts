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

// --- Week 2 additions ---

export const StoryPlanSchema = z.object({
  title: z.string().min(1),
  characterSheet: z.string().min(1),
  styleDescription: z.string().min(1),
  sceneOutline: z.array(z.string()).min(1),
  imagePrompts: z.array(z.string()).min(1),
});

export type StoryPlan = z.infer<typeof StoryPlanSchema>;

export const StoryStatusSchema = z.enum([
  'queued',
  'planning',
  'writing',
  'imaging',
  'done',
  'failed',
]);

export const StorySchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().nullable(),
  prompt: z.string(),
  title: z.string().nullable(),
  status: StoryStatusSchema,
  targetLength: z.number().int(),
  style: z.string(),
  jobId: z.string().nullable(),
  generatedText: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type StoryDto = z.infer<typeof StorySchema>;

export const GenerationProgressEventSchema = z.object({
  jobId: z.string(),
  status: StoryStatusSchema,
  progress: z.number().int().min(0).max(100),
  message: z.string().optional(),
});

export type GenerationProgressEventDto = z.infer<typeof GenerationProgressEventSchema>;
