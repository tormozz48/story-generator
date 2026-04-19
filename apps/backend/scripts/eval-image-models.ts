/**
 * Image model evaluation script — Week 3
 *
 * Runs 5 reference scenarios through 2–3 candidate Replicate models.
 * For each scenario: generates one reference portrait, then three scene images
 * IPAdapter-conditioned on that portrait.
 *
 * Usage:
 *   REPLICATE_API_KEY=<key> npx ts-node --project tsconfig.json scripts/eval-image-models.ts
 *
 * Output: evaluation/image-models/{model}/{scenario}/  +  manifest.json per scenario.
 *
 * NOTE: This script hits real Replicate APIs and costs money. It is NOT part of npm test.
 */

import fs from 'fs';
import path from 'path';

const REPLICATE_BASE = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 60; // 3 minutes per image

// ---------------------------------------------------------------------------
// Candidate models to evaluate
// ---------------------------------------------------------------------------

const CANDIDATE_MODELS = [
  {
    id: 'ip-adapter-sdxl',
    modelPath: 'lucataco/ip-adapter-sdxl', // IPAdapter, SDXL base — content-filtered but useful for consistency testing
    notes:
      'IPAdapter native support, SDXL base. SFW-only. Good for evaluating consistency mechanism.',
    supportsIpAdapter: true,
    referenceParam: 'image',
    ipScaleParam: 'ip_adapter_scale',
  },
  {
    id: 'sdxl-nsfw',
    // NOTE: Replace with an actual NSFW-capable SDXL model from current Replicate catalog.
    // Suggested search: https://replicate.com/explore?q=sdxl+nsfw
    // Example: "asiryan/reliberate-v3" (check current availability)
    modelPath: 'asiryan/reliberate-v3',
    notes: 'SDXL NSFW fine-tune. Check current Replicate catalog for availability and version.',
    supportsIpAdapter: false, // May not support IPAdapter natively; reference passed as style hint
    referenceParam: 'image',
    ipScaleParam: null,
  },
  {
    id: 'flux-nsfw',
    // NOTE: Replace with a Flux NSFW fine-tune from current Replicate catalog.
    // Suggested search: https://replicate.com/explore?q=flux+nsfw
    // Example: "xlabs-ai/flux-dev-realism" or a community NSFW Flux variant
    modelPath: 'xlabs-ai/flux-dev-realism',
    notes:
      'Flux-based model. Higher baseline quality. Check for NSFW capability and IPAdapter support.',
    supportsIpAdapter: false,
    referenceParam: 'image',
    ipScaleParam: null,
  },
];

// ---------------------------------------------------------------------------
// Evaluation scenarios — 5 scenarios covering diversity per docs/models.md
// ---------------------------------------------------------------------------

const SCENARIOS = [
  {
    id: 'scenario-01-romantic-indoor',
    description: 'Romantic indoor scene, European woman, realistic style',
    characterSheet:
      'Elena, 26 years old, tall European woman, auburn hair, blue eyes, elegant posture, soft features',
    styleDescription: 'Photorealistic, warm indoor lighting, intimate atmosphere',
    scenePrompts: [
      'Elena sitting at a candlelit dinner table, photorealistic, warm lighting, elegant dress',
      'Elena and a man slow dancing in a dimly lit room, photorealistic, romantic atmosphere',
      'Close-up of Elena smiling, photorealistic, warm light, detailed face',
    ],
  },
  {
    id: 'scenario-02-fantasy-outdoor',
    description: 'Fantasy outdoor setting, dark-haired woman, painterly style',
    characterSheet:
      'Mira, 28 years old, dark-haired Asian woman, dark almond eyes, slim athletic build, confident expression',
    styleDescription: 'Painterly fantasy style, vibrant colors, magical atmosphere, outdoor forest',
    scenePrompts: [
      'Mira standing in a magical forest, painterly art style, glowing flowers, fantasy atmosphere',
      'Mira in an enchanted clearing, colorful fantasy painting style, detailed',
      'Portrait of Mira with magical lighting, painterly illustration style',
    ],
  },
  {
    id: 'scenario-03-anime-beach',
    description: 'Anime style, beach setting',
    characterSheet:
      'Sakura, 22 years old, petite Japanese woman, short black hair with highlights, bright energetic personality',
    styleDescription: 'Anime art style, vibrant colors, cel shading, summer beach setting',
    scenePrompts: [
      'Sakura at a sunny beach, anime style, bright colors, detailed background',
      'Sakura playing in ocean waves, anime illustration, summer atmosphere',
      'Sakura close-up portrait, anime art, detailed eyes and hair',
    ],
  },
  {
    id: 'scenario-04-explicit-indoor',
    description: 'Explicit indoor scene — tests NSFW capability (SFW models will refuse/filter)',
    characterSheet:
      'Anna, 24 years old, tall brunette woman, green eyes, slim athletic build, confident and sensual',
    styleDescription:
      'Photorealistic, bedroom setting, warm soft lighting, NSFW explicit adult content',
    scenePrompts: [
      'Anna in a bedroom, photorealistic, intimate pose, adult content, detailed',
      'Anna in lingerie, photorealistic, warm lighting, adult content',
      'Adult intimate scene with Anna, photorealistic, NSFW explicit content',
    ],
  },
  {
    id: 'scenario-05-office-romance',
    description: 'Office setting, professional to intimate, two characters',
    characterSheet:
      'Sofia, 30 years old, professional European woman, blonde bob haircut, glasses, business attire',
    styleDescription: 'Photorealistic, corporate office environment transitioning to intimate',
    scenePrompts: [
      'Sofia at her office desk, photorealistic, professional business setting, detailed',
      'Sofia and a colleague in a conference room, photorealistic, close interaction',
      'Sofia close-up portrait in office, photorealistic, professional lighting',
    ],
  },
];

// ---------------------------------------------------------------------------
// Replicate API helpers
// ---------------------------------------------------------------------------

const apiKey = process.env['REPLICATE_API_KEY'];
if (!apiKey) {
  console.error('ERROR: REPLICATE_API_KEY environment variable is required');
  process.exit(1);
}

async function createPrediction(
  modelPath: string,
  input: Record<string, unknown>
): Promise<{ id: string; status: string }> {
  const [owner, name] = modelPath.split('/');
  const res = await fetch(`${REPLICATE_BASE}/models/${owner}/${name}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=10',
    },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Replicate POST error ${res.status}: ${body}`);
  }

  return res.json() as Promise<{ id: string; status: string }>;
}

async function pollPrediction(
  predId: string
): Promise<{ status: string; output?: string | string[]; error?: string }> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await fetch(`${REPLICATE_BASE}/predictions/${predId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const pred = (await res.json()) as {
      status: string;
      output?: string | string[];
      error?: string;
    };

    if (pred.status === 'succeeded') return pred;
    if (pred.status === 'failed' || pred.status === 'canceled') {
      throw new Error(`Prediction ${predId} ${pred.status}: ${pred.error ?? 'unknown'}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`Prediction ${predId} timed out`);
}

function extractUrl(output: string | string[] | undefined): string {
  if (!output) throw new Error('Empty output');
  return Array.isArray(output) ? output[0]! : output;
}

async function downloadImage(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  console.log(`  Saved: ${destPath} (${buf.length} bytes)`);
}

async function generateImage(
  model: (typeof CANDIDATE_MODELS)[0],
  prompt: string,
  negativePrompt: string,
  referenceUrl: string | null
): Promise<string> {
  const input: Record<string, unknown> = {
    prompt,
    negative_prompt: negativePrompt,
    num_inference_steps: 30,
    guidance_scale: 7.5,
    width: 768,
    height: 768,
  };

  if (referenceUrl && model.referenceParam) {
    input[model.referenceParam] = referenceUrl;
    if (model.ipScaleParam) {
      input[model.ipScaleParam] = 0.6;
    }
  }

  let pred = await createPrediction(model.modelPath, input);
  if (pred.status !== 'succeeded') {
    pred = await pollPrediction(pred.id);
  }

  return extractUrl((pred as { output?: string | string[] }).output);
}

// ---------------------------------------------------------------------------
// Main evaluation loop
// ---------------------------------------------------------------------------

const OUTPUT_ROOT = path.join(__dirname, '../../../evaluation/image-models');

async function runEval() {
  console.log('=== Image Model Evaluation — Week 3 ===\n');
  console.log(`Models to evaluate: ${CANDIDATE_MODELS.map((m) => m.id).join(', ')}`);
  console.log(`Scenarios: ${SCENARIOS.length}`);
  console.log(`Output directory: ${OUTPUT_ROOT}\n`);

  const negativePrompt =
    'deformed, blurry, bad anatomy, extra limbs, watermark, text, logo, low quality, worst quality';

  for (const model of CANDIDATE_MODELS) {
    console.log(`\n=== Model: ${model.id} (${model.modelPath}) ===`);
    console.log(`  Notes: ${model.notes}`);

    for (const scenario of SCENARIOS) {
      const scenarioDir = path.join(OUTPUT_ROOT, model.id, scenario.id);
      fs.mkdirSync(scenarioDir, { recursive: true });

      console.log(`\n  Scenario: ${scenario.id}`);
      console.log(`  Description: ${scenario.description}`);

      const manifest: {
        model: string;
        modelPath: string;
        scenario: string;
        characterSheet: string;
        styleDescription: string;
        referencePortrait: { prompt: string; url?: string; file?: string; error?: string };
        sceneImages: Array<{
          index: number;
          prompt: string;
          url?: string;
          file?: string;
          error?: string;
        }>;
        generatedAt: string;
      } = {
        model: model.id,
        modelPath: model.modelPath,
        scenario: scenario.id,
        characterSheet: scenario.characterSheet,
        styleDescription: scenario.styleDescription,
        referencePortrait: { prompt: '' },
        sceneImages: [],
        generatedAt: new Date().toISOString(),
      };

      // 1. Generate reference portrait
      const portraitPrompt = `portrait of ${scenario.characterSheet}, ${scenario.styleDescription}, photorealistic, highly detailed`;
      manifest.referencePortrait.prompt = portraitPrompt;
      console.log(`  [1/4] Reference portrait...`);

      let referenceUrl: string | null = null;
      try {
        referenceUrl = await generateImage(model, portraitPrompt, negativePrompt, null);
        const portraitFile = path.join(scenarioDir, 'reference.png');
        await downloadImage(referenceUrl, portraitFile);
        manifest.referencePortrait.url = referenceUrl;
        manifest.referencePortrait.file = 'reference.png';
      } catch (err) {
        console.error(`  [ERROR] Reference portrait failed: ${String(err)}`);
        manifest.referencePortrait.error = String(err);
      }

      // 2. Generate 3 scene images conditioned on reference portrait
      for (let si = 0; si < scenario.scenePrompts.length; si++) {
        const scenePrompt = `${scenario.scenePrompts[si]}, ${scenario.styleDescription}`;
        const sceneEntry: (typeof manifest.sceneImages)[0] = {
          index: si,
          prompt: scenePrompt,
        };

        console.log(
          `  [${si + 2}/4] Scene ${si + 1}: ${scenario.scenePrompts[si]?.slice(0, 50)}...`
        );

        try {
          const sceneUrl = await generateImage(
            model,
            scenePrompt,
            negativePrompt,
            referenceUrl // IPAdapter conditioning on reference portrait
          );
          const sceneFile = path.join(scenarioDir, `scene-${si}.png`);
          await downloadImage(sceneUrl, sceneFile);
          sceneEntry.url = sceneUrl;
          sceneEntry.file = `scene-${si}.png`;
        } catch (err) {
          console.error(`  [ERROR] Scene ${si} failed: ${String(err)}`);
          sceneEntry.error = String(err);
        }

        manifest.sceneImages.push(sceneEntry);
      }

      // Write manifest
      const manifestPath = path.join(scenarioDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`  Manifest written: ${manifestPath}`);
    }
  }

  console.log('\n=== Evaluation complete ===');
  console.log(`Results in: ${OUTPUT_ROOT}`);
  console.log('\nNext steps for founder review:');
  console.log('1. Open each evaluation/image-models/{model}/{scenario}/ folder');
  console.log('2. Compare reference.png + scene-0/1/2.png across models');
  console.log(
    '3. Assess: character consistency, style adherence, NSFW capability, aesthetic quality'
  );
  console.log('4. Update REPLICATE_IMAGE_MODEL in .env and docs/models.md with chosen model');
}

runEval().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
