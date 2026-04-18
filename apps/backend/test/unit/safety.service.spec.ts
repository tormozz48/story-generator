import { describe, it, expect } from 'vitest';

import { SafetyService } from '../../src/modules/safety/safety.service';

describe('SafetyService (stub)', () => {
  const service = new SafetyService();

  it('returns safe=true for any prompt (stub behaviour)', () => {
    const result = service.checkPrompt('Romantic story set in Moscow');
    expect(result.safe).toBe(true);
  });

  it('is callable — smoke test for unit harness', () => {
    expect(service).toBeDefined();
  });
});
