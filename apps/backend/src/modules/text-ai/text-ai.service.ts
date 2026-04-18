import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoryPlanSchema } from '@story-generator/shared';
import type { StoryPlan } from '@story-generator/shared';
import { z } from 'zod';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

const OpenRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      })
    )
    .min(1),
});

@Injectable()
export class TextAiService {
  private readonly logger = new Logger(TextAiService.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>('OPENROUTER_API_KEY', '');
    this.model = config.get<string>('OPENROUTER_TEXT_MODEL', 'qwen/qwen-2.5-72b-instruct');
  }

  /**
   * Planning step: given a user prompt, produce a structured story plan.
   * Returns: { title, characterSheet, styleDescription, sceneOutline[], imagePrompts[] }
   */
  async plan(prompt: string): Promise<StoryPlan> {
    this.logger.log(`Planning story for prompt (${prompt.length} chars), model=${this.model}`);

    const systemPrompt = `Ты — профессиональный автор эротических романов. Твоя задача — составить структурированный план истории на русском языке.

Ответь ТОЛЬКО валидным JSON без markdown, без комментариев, строго в следующем формате:
{
  "title": "Название истории",
  "characterSheet": "Описание главного персонажа: возраст (обязательно 18+), внешность, характер, особые приметы",
  "styleDescription": "Единый визуальный стиль для всех иллюстраций",
  "sceneOutline": ["Сцена 1: ...", "Сцена 2: ...", "Сцена 3: ..."],
  "imagePrompts": ["Prompt for image 1 in English", "Prompt for image 2 in English", "Prompt for image 3 in English"]
}

Требования:
- Все персонажи строго 18+ лет
- 3-5 сцен в sceneOutline
- Каждому элементу sceneOutline соответствует imagePrompts того же индекса
- imagePrompts — на английском языке, детализированные
- characterSheet включает точный возраст (минимум 18)`;

    const content = await this.callOpenRouter(systemPrompt, prompt);

    // Strip potential markdown fences if model wraps JSON in code blocks
    const jsonStr = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      this.logger.error(`Plan response is not valid JSON: ${content.slice(0, 200)}`);
      throw new Error('TextAiService.plan: model did not return valid JSON');
    }

    const result = StoryPlanSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(`Plan schema validation failed: ${result.error.message}`);
      throw new Error('TextAiService.plan: response does not match StoryPlanSchema');
    }

    return result.data;
  }

  /**
   * Story writing step: given a plan and target word count, write the full story.
   * Single-call only (≤4000 words). Chunking is deferred.
   */
  async writeStory(plan: StoryPlan, targetLength: number): Promise<string> {
    this.logger.log(`Writing story, targetLength=${targetLength}, model=${this.model}`);

    const systemPrompt = `Ты — мастер эротической прозы. Пиши на русском языке, живым литературным стилем.
Все персонажи строго совершеннолетние (18+). Не упоминай возраст меньше 18 лет.
Пиши связный, увлекательный текст — не список сцен, а полноценный рассказ.`;

    const userPrompt = `Напиши историю по следующему плану. Целевой объём: примерно ${targetLength} слов.

Название: ${plan.title}

Персонаж: ${plan.characterSheet}

Стиль: ${plan.styleDescription}

Сцены:
${plan.sceneOutline.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Пиши сплошным художественным текстом. Начни сразу с истории, без вводных слов.`;

    return this.callOpenRouter(systemPrompt, userPrompt);
  }

  private async callOpenRouter(systemPrompt: string, userContent: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://story-generator.local',
        'X-Title': 'Story Generator PoC',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.9,
        max_tokens: 8192,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${body}`);
    }

    const json: unknown = await res.json();
    const parsed = OpenRouterResponseSchema.parse(json);
    return parsed.choices[0].message.content;
  }
}
