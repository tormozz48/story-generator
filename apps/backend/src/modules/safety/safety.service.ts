import { Injectable, Logger } from '@nestjs/common';

export type SafetyCheckResult = { safe: boolean; reason?: string };

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  /**
   * Check prompt safety before any AI call.
   * TODO: Week 4 — implement keyword blocklist, CSAM pattern filters, length limits.
   * This stub always passes to unblock Week 1 skeleton.
   */
  checkPrompt(prompt: string): SafetyCheckResult {
    // TODO: Week 4 — replace stub with real blocklist + pattern filters
    this.logger.debug(`Safety check (stub) for prompt of length ${prompt.length}`);
    return { safe: true };
  }
}
