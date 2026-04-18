import { Injectable, Logger } from '@nestjs/common';

import { UnsafePromptError } from './unsafe-prompt.error';

/**
 * CSAM-focused keyword blocklist — Russian and English terms.
 * These strings are lowercased substrings; any prompt containing one is blocked.
 * Russian keywords use prefix forms to catch all grammatical inflections.
 */
const BLOCKED_KEYWORDS: string[] = [
  // Russian CSAM terms (prefix forms catch all inflections)
  'несовершеннолетн', // несовершеннолетний/яя/его/ей etc.
  'малолетн',         // малолетний/яя/его etc.
  'детский секс',
  'детское порно',
  'школьник',
  'школьниц',
  'подросток',
  'подростков',
  'лолита',
  'инцест с детьми',
  'инцест с ребёнком',
  'инцест с ребенком',
  // English CSAM terms
  'child pornography',
  'child porn',
  'cp porn',
  'minor sex',
  'underage sex',
  'underage porn',
  'lolita sex',
  'preteen',
  'incest with minor',
  'pedo',
  'pedophil',
];

/**
 * Age-indicating patterns: phrases that claim or imply the subject is under 18.
 * Tested case-insensitively against the full prompt.
 * Note: JavaScript \b does not work with Cyrillic (\w = ASCII only).
 * Use (?<!\d) / (?!\d) lookbehind/lookahead for digit boundaries in Russian patterns.
 */
const AGE_PATTERNS: RegExp[] = [
  // Russian patterns: "12 лет", "9 лет" — digit 1-17 not surrounded by other digits
  /(?<!\d)([1-9]|1[0-7])(?!\d)\s*лет/i,
  // "14-летняя", "9-летний"
  /(?<!\d)([1-9]|1[0-7])(?!\d)-летн/i,
  // "ей 13", "ему 16" — pronoun + under-18 number
  /(?:ей|ему)\s+([1-9]|1[0-7])(?!\d)/i,
  // English patterns: "12 years old", "14-year-old", "she is 15"
  /\b([1-9]|1[0-7])\s*(years?\s*old|yr\.?\s*old)\b/i,
  /\b([1-9]|1[0-7])-year-old\b/i,
  /\b(she|he|they)\s+is\s+([1-9]|1[0-7])\b/i,
  // Explicit teen/kid framing combined with sexual context signals
  /\b(teen|teenager|juvenile|minor|child|kid|boy|girl)\b.{0,50}\b(sex|naked|nude|porn|erotic|explicit)\b/i,
];

const MAX_PROMPT_LENGTH = 2000;

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  /**
   * Checks a prompt for CSAM-related content before any AI call.
   * Throws UnsafePromptError if the prompt is blocked.
   * Logs all blocked attempts for later rule tuning.
   */
  checkPrompt(prompt: string): void {
    if (prompt.length > MAX_PROMPT_LENGTH) {
      this.logger.warn({ event: 'prompt_blocked', reason: 'length_exceeded', length: prompt.length });
      throw new UnsafePromptError('prompt exceeds maximum length');
    }

    const lower = prompt.toLowerCase();

    for (const keyword of BLOCKED_KEYWORDS) {
      if (lower.includes(keyword)) {
        this.logger.warn({ event: 'prompt_blocked', reason: 'keyword', keyword });
        throw new UnsafePromptError(`blocked keyword: ${keyword}`);
      }
    }

    for (const pattern of AGE_PATTERNS) {
      if (pattern.test(prompt)) {
        this.logger.warn({ event: 'prompt_blocked', reason: 'age_pattern', pattern: pattern.source });
        throw new UnsafePromptError('age-indicating pattern matched');
      }
    }
  }
}
