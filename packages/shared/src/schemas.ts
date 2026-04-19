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
  'portrait',
  'scenes',
  'done',
  'failed',
]);

// --- Week 3 additions ---

export const ImageKindSchema = z.enum(['reference', 'scene']);
export type ImageKind = z.infer<typeof ImageKindSchema>;

export const ImageStatusSchema = z.enum(['done', 'failed']);
export type ImageStatus = z.infer<typeof ImageStatusSchema>;

export const ImageSchema = z.object({
  id: z.string().uuid(),
  storyId: z.string().uuid(),
  kind: ImageKindSchema,
  sceneIndex: z.number().int().nullable(),
  storageKey: z.string(),
  url: z.string(),
  status: ImageStatusSchema,
  createdAt: z.string(),
});

export type ImageDto = z.infer<typeof ImageSchema>;

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
  images: z.array(ImageSchema).default([]),
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

// --- Style presets ---

export type StylePreset = {
  id: StoryStyle;
  label: string;
  /** Replicate model string (owner/name) — empty string means use REPLICATE_IMAGE_MODEL env var */
  baseModel: string;
  /** LoRA identifiers to activate on the model (passed as lora_weights if supported) */
  loras: string[];
  /** Appended to every image prompt for stylistic direction */
  promptSuffix: string;
  negativePrompt: string;
  sampler: string;
  steps: number;
  cfg: number;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'photorealistic',
    label: 'Фотореализм',
    baseModel: '',
    loras: [],
    promptSuffix:
      'photorealistic, hyperrealistic, 8k photography, sharp focus, highly detailed, cinematic lighting',
    negativePrompt:
      'cartoon, anime, illustration, painting, sketch, deformed, blurry, bad anatomy, watermark, text, logo',
    sampler: 'DPMSolverMultistep',
    steps: 30,
    cfg: 7.5,
  },
  {
    id: 'anime',
    label: 'Аниме',
    baseModel: '',
    loras: [],
    promptSuffix:
      'anime style, manga art, cel shading, vibrant colors, high quality anime illustration',
    negativePrompt:
      'photorealistic, photograph, 3d render, deformed, bad anatomy, extra limbs, watermark',
    sampler: 'Euler',
    steps: 28,
    cfg: 7.0,
  },
  {
    id: 'painterly',
    label: 'Живопись',
    baseModel: '',
    loras: [],
    promptSuffix:
      'oil painting, painterly style, brush strokes, artistic, fine art, classical painting style',
    negativePrompt: 'photograph, photorealistic, anime, deformed, bad anatomy, watermark, text',
    sampler: 'DPMSolverMultistep',
    steps: 35,
    cfg: 8.0,
  },
  {
    id: 'illustration',
    label: 'Иллюстрация',
    baseModel: '',
    loras: [],
    promptSuffix:
      'digital illustration, concept art, detailed illustration, professional digital art',
    negativePrompt:
      'photograph, photorealistic, bad anatomy, deformed, watermark, text, low quality',
    sampler: 'DPMSolverMultistep',
    steps: 30,
    cfg: 7.5,
  },
  {
    id: 'comic',
    label: 'Комикс',
    baseModel: '',
    loras: [],
    promptSuffix:
      'comic book art, comic style, bold lines, flat colors, graphic novel illustration',
    negativePrompt: 'photorealistic, photograph, blurry, deformed, bad anatomy, watermark, text',
    sampler: 'Euler',
    steps: 25,
    cfg: 7.0,
  },
];

export function getStylePreset(id: string): StylePreset {
  const preset = STYLE_PRESETS.find((p) => p.id === id);
  if (!preset) {
    // Fall back to photorealistic if style not found
    return STYLE_PRESETS[0]!;
  }
  return preset;
}
