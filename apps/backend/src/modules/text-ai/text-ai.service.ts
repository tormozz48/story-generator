import { Injectable } from '@nestjs/common';

// TODO: Week 2 — implement OpenRouter adapter
@Injectable()
export class TextAiService {
  generateStory(_prompt: string, _options: Record<string, unknown>): Promise<string> {
    throw new Error('TextAiService not implemented — Week 2');
  }
}
