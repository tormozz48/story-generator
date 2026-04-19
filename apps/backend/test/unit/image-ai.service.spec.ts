/**
 * Unit tests for ImageAiService helpers and style preset lookup.
 * No I/O — all external calls are mocked.
 */
import { ConfigService } from '@nestjs/config';
import { getStylePreset, STYLE_PRESETS } from '@story-generator/shared';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ImageAiService } from '../../src/modules/image-ai/image-ai.service';
import { StorageService } from '../../src/modules/storage/storage.service';

describe('getStylePreset', () => {
  it('returns the correct preset for each known style', () => {
    for (const preset of STYLE_PRESETS) {
      const result = getStylePreset(preset.id);
      expect(result.id).toBe(preset.id);
      expect(result.steps).toBeGreaterThan(0);
      expect(result.cfg).toBeGreaterThan(0);
      expect(result.negativePrompt.length).toBeGreaterThan(0);
    }
  });

  it('falls back to photorealistic for unknown style id', () => {
    const result = getStylePreset('unknown-style');
    expect(result.id).toBe('photorealistic');
  });

  it('returns preset with non-empty promptSuffix', () => {
    expect(getStylePreset('anime').promptSuffix).toContain('anime');
    expect(getStylePreset('painterly').promptSuffix).toContain('paint');
    expect(getStylePreset('comic').promptSuffix).toContain('comic');
  });
});

describe('ImageAiService — scene-failure handling', () => {
  let service: ImageAiService;
  let mockStorage: StorageService;

  beforeEach(() => {
    const mockConfig = {
      get: (key: string, def?: unknown) => {
        if (key === 'REPLICATE_API_KEY') return 'test-key';
        if (key === 'REPLICATE_IMAGE_MODEL') return 'lucataco/ip-adapter-sdxl';
        return def;
      },
    } as unknown as ConfigService;

    mockStorage = {
      uploadImageFromUrl: vi.fn().mockResolvedValue('http://minio/bucket/key.png'),
      getObjectUrl: vi.fn().mockReturnValue('http://minio/bucket/key.png'),
    } as unknown as StorageService;

    service = new ImageAiService(mockConfig, mockStorage);
  });

  it('returns a failed placeholder when a single scene prediction fails', async () => {
    // Mock runPrediction to fail on scene index 1 (second prompt)
    let callCount = 0;
    vi.spyOn(
      service as unknown as { runPrediction: () => Promise<string> },
      'runPrediction' as never
    ).mockImplementation(async () => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Replicate prediction failed: NSFW blocked');
      }
      return 'https://replicate.delivery/test.png';
    });

    const results = await service.generateSceneImages(
      ['prompt 1', 'prompt 2', 'prompt 3'],
      { url: 'http://minio/ref.png', storageKey: 'ref.png' },
      'photorealistic style',
      'story-uuid-123',
      'photorealistic'
    );

    expect(results).toHaveLength(3);
    // First scene succeeded
    expect(results[0]?.url).toBeTruthy();
    expect(results[0]?.sceneIndex).toBe(0);
    // Second scene failed — placeholder
    expect(results[1]?.url).toBe('');
    expect(results[1]?.storageKey).toBe('');
    expect(results[1]?.sceneIndex).toBe(1);
    // Third scene succeeded
    expect(results[2]?.url).toBeTruthy();
    expect(results[2]?.sceneIndex).toBe(2);
  });

  it('returns all results even when all scenes fail', async () => {
    vi.spyOn(
      service as unknown as { runPrediction: () => Promise<string> },
      'runPrediction' as never
    ).mockRejectedValue(new Error('All failed'));

    const results = await service.generateSceneImages(
      ['p1', 'p2'],
      { url: 'http://ref.png', storageKey: 'ref.png' },
      'style',
      'story-id',
      'anime'
    );

    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.url).toBe('');
      expect(r.storageKey).toBe('');
    }
  });
});
