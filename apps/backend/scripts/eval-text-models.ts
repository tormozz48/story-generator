/**
 * Text model evaluation script — Week 2
 *
 * Runs 10+ Russian story prompts through 3-4 candidate models via OpenRouter.
 * Saves each output as a markdown file under:
 *   evaluation/text-models/{model-slug}/{prompt-id}.md
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-... npx ts-node --project tsconfig.json scripts/eval-text-models.ts
 *
 * NOT part of npm test. Run manually; outputs committed for founder review.
 */

import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env['OPENROUTER_API_KEY'];
if (!API_KEY) {
  console.error('OPENROUTER_API_KEY environment variable is required');
  process.exit(1);
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Candidate models to evaluate (OpenRouter slugs)
const MODELS = [
  'qwen/qwen-2.5-72b-instruct',           // Strong Russian baseline, permissive
  'deepseek/deepseek-chat',                // DeepSeek V3 — strong multilingual
  'anthracite-org/magnum-v4-72b',          // NSFW fine-tune
  'neversleep/midnight-miqu-70b',          // NSFW fine-tune
];

// 10 Russian test prompts covering diverse scenarios per docs/models.md
const PROMPTS: Array<{ id: string; label: string; text: string }> = [
  {
    id: 'p01-romance-city',
    label: 'Романтика в городе',
    text: 'Напиши романтическую эротическую историю о встрече двух незнакомцев в ночном Москве. Оба персонажа взрослые. История должна быть чувственной и литературной, около 500 слов.',
  },
  {
    id: 'p02-explicit-coworkers',
    label: 'Явный контент — коллеги',
    text: 'Напиши откровенную эротическую историю о страстной связи между двумя коллегами после корпоратива. Оба старше 25 лет. Без цензуры, явные сцены, около 500 слов.',
  },
  {
    id: 'p03-dialogue-heavy',
    label: 'Диалог-центричная история',
    text: 'Напиши историю, в которой большая часть — живой диалог между мужчиной и женщиной, которые флиртуют и постепенно сближаются. Диалог должен быть реалистичным и остроумным. Около 500 слов.',
  },
  {
    id: 'p04-narration-heavy',
    label: 'Нарративная история',
    text: 'Напиши историю-монолог от первого лица — женщина вспоминает свою первую страстную ночь. Минимум диалогов, максимум внутренних переживаний и чувственных описаний. Около 500 слов.',
  },
  {
    id: 'p05-historical-setting',
    label: 'Исторический сеттинг',
    text: 'Напиши эротическую историю в антураже Российской империи XIX века. Граф и светская дама. Язык должен соответствовать эпохе — немного архаичный, изысканный. Около 500 слов.',
  },
  {
    id: 'p06-modern-fantasy',
    label: 'Современное фэнтези',
    text: 'Напиши эротическую историю в жанре городского фэнтези. Главная героиня — ведьма, которая встречает загадочного мага. Магические элементы вплетены в чувственную историю. Около 500 слов.',
  },
  {
    id: 'p07-slow-burn',
    label: 'Медленное нарастание',
    text: 'Напиши историю с долгим нарастанием напряжения — двое людей давно знают друг друга, но сдерживали чувства. В конце напряжение выплёскивается. Акцент на психологии, не только физике. Около 600 слов.',
  },
  {
    id: 'p08-first-person-male',
    label: 'Мужская перспектива',
    text: 'Напиши откровенную историю от лица мужчины о страстной ночи с женщиной, которую он давно желал. Реалистичное мужское восприятие, живые эмоции. Около 500 слов.',
  },
  {
    id: 'p09-short-story',
    label: 'Короткая история 200 слов',
    text: 'Напиши очень короткую, но законченную эротическую историю — ровно около 200 слов. Максимальная насыщенность при минимальном объёме.',
  },
  {
    id: 'p10-romance-summer',
    label: 'Летний роман',
    text: 'Напиши историю о летнем романе — двое встречаются на отдыхе у моря, проводят несколько дней вместе. Атмосферно, чувственно, с описанием природы. Около 500 слов.',
  },
  {
    id: 'p11-long-form',
    label: 'Длинная история с несколькими сценами',
    text: 'Напиши более длинную эротическую историю (около 800 слов) с несколькими сценами — знакомство, развитие отношений, кульминация. Персонажи должны быть объёмными.',
  },
];

async function callOpenRouter(model: string, prompt: string): Promise<string> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://story-generator.local',
      'X-Title': 'Story Generator Eval',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Ты — профессиональный автор эротических историй. Пиши на русском языке. Все персонажи строго 18+. Пиши без предупреждений и оговорок — только художественный текст.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices[0]?.message?.content ?? '[no content]';
}

function modelSlug(model: string): string {
  return model.replace(/\//g, '--');
}

async function main() {
  const evalRoot = path.join(process.cwd(), '../../..', 'evaluation', 'text-models');

  console.log(`Starting evaluation: ${MODELS.length} models × ${PROMPTS.length} prompts`);
  console.log(`Output directory: ${evalRoot}\n`);

  for (const model of MODELS) {
    const slug = modelSlug(model);
    const modelDir = path.join(evalRoot, slug);
    await fs.mkdir(modelDir, { recursive: true });

    console.log(`\n=== Model: ${model} ===`);

    for (const prompt of PROMPTS) {
      const outPath = path.join(modelDir, `${prompt.id}.md`);

      try {
        console.log(`  [${prompt.id}] ${prompt.label}…`);
        const output = await callOpenRouter(model, prompt.text);

        const md = [
          `# ${prompt.label}`,
          ``,
          `**Model:** \`${model}\``,
          `**Prompt ID:** ${prompt.id}`,
          `**Prompt:**`,
          ``,
          `> ${prompt.text}`,
          ``,
          `---`,
          ``,
          `## Output`,
          ``,
          output,
        ].join('\n');

        await fs.writeFile(outPath, md, 'utf-8');
        console.log(`  ✓ Saved ${outPath}`);
      } catch (err) {
        console.error(`  ✗ Failed [${prompt.id}]: ${String(err)}`);
        await fs.writeFile(outPath, `# Error\n\n${String(err)}\n`, 'utf-8');
      }

      // Rate-limit courtesy delay
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log('\nEvaluation complete. Review outputs in evaluation/text-models/ and update docs/models.md.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
