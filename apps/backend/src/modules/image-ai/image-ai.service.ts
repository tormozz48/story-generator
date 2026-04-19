import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getStylePreset } from '@story-generator/shared';
import { z } from 'zod';

import { StorageService } from '../storage/storage.service';

const REPLICATE_BASE = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 90; // 3 minutes max per image

const PredictionSchema = z.object({
  id: z.string(),
  status: z.enum(['starting', 'processing', 'succeeded', 'failed', 'canceled']),
  output: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  error: z.string().nullable().optional(),
});

type Prediction = z.infer<typeof PredictionSchema>;

export type ImageResult = {
  url: string;
  storageKey: string;
};

export type SceneImageResult = ImageResult & { sceneIndex: number };

@Injectable()
export class ImageAiService {
  private readonly logger = new Logger(ImageAiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private cachedVersion: string | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService
  ) {
    this.apiKey = config.get<string>('REPLICATE_API_KEY', '');
    this.model = config.get<string>('REPLICATE_IMAGE_MODEL', 'stability-ai/sdxl');
  }

  /**
   * Generates the reference portrait for a story's main character.
   * Returns MinIO-backed URL + storage key.
   */
  async generateReferencePortrait(
    characterSheet: string,
    styleDescription: string,
    storyId: string,
    style: string
  ): Promise<ImageResult> {
    const preset = getStylePreset(style);
    const prompt = `portrait of ${characterSheet}, ${styleDescription}, ${preset.promptSuffix}`;

    this.logger.log(`Generating reference portrait for story ${storyId}, style=${style}`);

    const replicateUrl = await this.runPrediction(prompt, undefined, preset.negativePrompt, preset);
    const key = `images/${storyId}/reference.png`;
    const url = await this.storage.uploadImageFromUrl(replicateUrl, key);

    return { url, storageKey: key };
  }

  /**
   * Generates scene images sequentially, conditioned on the reference portrait via img2img.
   * A single scene failure does not fail the batch — that scene is returned with status 'failed'.
   */
  async generateSceneImages(
    imagePrompts: string[],
    referencePortrait: ImageResult,
    styleDescription: string,
    storyId: string,
    style: string
  ): Promise<SceneImageResult[]> {
    const preset = getStylePreset(style);

    this.logger.log(
      `Generating ${imagePrompts.length} scene images for story ${storyId}, style=${style}`
    );

    // Load reference portrait as base64 data URI so Replicate can access it
    // (the public MinIO URL may be localhost and unreachable from Replicate's servers)
    const referenceDataUrl = await this.storage.getObjectAsDataUrl(referencePortrait.storageKey);

    const results: SceneImageResult[] = [];
    for (let index = 0; index < imagePrompts.length; index++) {
      try {
        const result = await this.generateOneSceneImage(
          imagePrompts[index],
          referenceDataUrl,
          styleDescription,
          preset,
          storyId,
          index
        );
        results.push({ ...result, sceneIndex: index });
      } catch (err) {
        this.logger.error(`Scene image ${index} for story ${storyId} failed: ${String(err)}`);
        results.push({ url: '', storageKey: '', sceneIndex: index, status: 'failed' as const });
      }
    }
    return results;
  }

  private async generateOneSceneImage(
    prompt: string,
    referenceImageUrl: string,
    styleDescription: string,
    preset: ReturnType<typeof getStylePreset>,
    storyId: string,
    index: number
  ): Promise<ImageResult> {
    const fullPrompt = `${prompt}, ${styleDescription}, ${preset.promptSuffix}`;
    const key = `images/${storyId}/scene-${index}.png`;

    const replicateUrl = await this.runPrediction(
      fullPrompt,
      referenceImageUrl,
      preset.negativePrompt,
      preset
    );
    const url = await this.storage.uploadImageFromUrl(replicateUrl, key);

    return { url, storageKey: key };
  }

  /**
   * Creates a Replicate prediction and polls until it completes.
   * Returns the output image URL from Replicate (before MinIO upload).
   */
  private async runPrediction(
    prompt: string,
    referenceImageUrl: string | undefined,
    negativePrompt: string,
    preset: ReturnType<typeof getStylePreset>
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('REPLICATE_API_KEY is not configured');
    }

    const input: Record<string, unknown> = {
      prompt,
      negative_prompt: negativePrompt,
      num_inference_steps: preset.steps,
      guidance_scale: preset.cfg,
      scheduler: preset.sampler,
      width: 768,
      height: 768,
    };

    // img2img conditioning: pass reference image if provided
    if (referenceImageUrl) {
      input['image'] = referenceImageUrl;
      input['prompt_strength'] = 0.6;
    }

    const version = await this.resolveLatestVersion();

    let res: Response;
    for (let attempt = 0; attempt < 5; attempt++) {
      res = await fetch(`${REPLICATE_BASE}/predictions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'wait=5',
        },
        body: JSON.stringify({ version, input }),
      });

      if (res.status !== 429) break;

      const body429 = (await res.json()) as { retry_after?: number };
      const waitMs = ((body429.retry_after ?? 10) + 1) * 1000;
      this.logger.warn(`Replicate rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1})`);
      await sleep(waitMs);
    }

    if (!res!.ok) {
      const body = await res!.text();
      throw new Error(`Replicate API error ${res!.status}: ${body}`);
    }

    const prediction = PredictionSchema.parse(await res.json());

    // Poll until complete
    const completed = await this.pollPrediction(prediction);
    return this.extractOutputUrl(completed);
  }

  private async pollPrediction(initial: Prediction): Promise<Prediction> {
    let prediction = initial;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (prediction.status === 'succeeded') {
        return prediction;
      }
      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        throw new Error(
          `Replicate prediction ${prediction.id} ${prediction.status}: ${prediction.error ?? 'unknown error'}`
        );
      }

      await sleep(POLL_INTERVAL_MS);

      const res = await fetch(`${REPLICATE_BASE}/predictions/${prediction.id}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!res.ok) {
        throw new Error(`Replicate poll error ${res.status} for prediction ${prediction.id}`);
      }

      prediction = PredictionSchema.parse(await res.json());
    }

    throw new Error(
      `Replicate prediction ${prediction.id} timed out after ${MAX_POLL_ATTEMPTS} polls`
    );
  }

  private async resolveLatestVersion(): Promise<string> {
    if (this.cachedVersion) return this.cachedVersion;
    const [owner, name] = this.model.split('/');
    const res = await fetch(`${REPLICATE_BASE}/models/${owner}/${name}/versions`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch model versions for ${this.model}: ${res.status}`);
    }
    const data = (await res.json()) as { results: Array<{ id: string }> };
    const version = data.results?.[0]?.id;
    if (!version) {
      throw new Error(`No versions found for model ${this.model}`);
    }
    this.cachedVersion = version;
    return version;
  }

  private extractOutputUrl(prediction: Prediction): string {
    const output = prediction.output;
    if (!output) {
      throw new Error(`Replicate prediction ${prediction.id} returned no output`);
    }
    // Some models return an array, others a string
    const url = Array.isArray(output) ? output[0] : output;
    if (!url) {
      throw new Error(`Replicate prediction ${prediction.id} output is empty`);
    }
    return url;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
