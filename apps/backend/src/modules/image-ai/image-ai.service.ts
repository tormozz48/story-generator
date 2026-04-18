import { Injectable } from '@nestjs/common';

// TODO: Week 3 — implement Replicate adapter
@Injectable()
export class ImageAiService {
  generateImages(_prompts: string[], _referenceImage?: string): Promise<string[]> {
    throw new Error('ImageAiService not implemented — Week 3');
  }
}
