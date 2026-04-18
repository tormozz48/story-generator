import { describe, it, expect } from 'vitest';

import { SafetyService } from '../../src/modules/safety/safety.service';
import { UnsafePromptError } from '../../src/modules/safety/unsafe-prompt.error';

describe('SafetyService', () => {
  const service = new SafetyService();

  describe('safe prompts', () => {
    it('passes a standard adult romantic story prompt', () => {
      expect(() =>
        service.checkPrompt('Романтическая история о встрече двух взрослых людей в Москве')
      ).not.toThrow();
    });

    it('passes an explicit adult prompt without age indicators', () => {
      expect(() =>
        service.checkPrompt('Страстная ночь между двумя коллегами после корпоратива')
      ).not.toThrow();
    });

    it('passes when a person is explicitly 18', () => {
      expect(() =>
        service.checkPrompt('Студентке 18 лет, она только поступила в университет')
      ).not.toThrow();
    });

    it('passes with age 19', () => {
      expect(() =>
        service.checkPrompt('Ему было 19 лет, когда они встретились')
      ).not.toThrow();
    });
  });

  describe('blocked prompts — keywords', () => {
    it('blocks Russian CSAM keyword: детское порно', () => {
      expect(() =>
        service.checkPrompt('детское порно история')
      ).toThrow(UnsafePromptError);
    });

    it('blocks Russian keyword: несовершеннолетний', () => {
      expect(() =>
        service.checkPrompt('история про несовершеннолетнего')
      ).toThrow(UnsafePromptError);
    });

    it('blocks Russian keyword: подросток in sexual context', () => {
      expect(() =>
        service.checkPrompt('подросток секс история')
      ).toThrow(UnsafePromptError);
    });

    it('blocks English CSAM keyword: child porn', () => {
      expect(() =>
        service.checkPrompt('child porn story')
      ).toThrow(UnsafePromptError);
    });

    it('blocks English keyword: underage sex', () => {
      expect(() =>
        service.checkPrompt('underage sex story')
      ).toThrow(UnsafePromptError);
    });

    it('blocks English keyword: preteen', () => {
      expect(() =>
        service.checkPrompt('preteen story')
      ).toThrow(UnsafePromptError);
    });
  });

  describe('blocked prompts — age patterns', () => {
    it('blocks "12 лет" (under 18)', () => {
      expect(() =>
        service.checkPrompt('девушке 12 лет и она красивая')
      ).toThrow(UnsafePromptError);
    });

    it('blocks "15-летняя"', () => {
      expect(() =>
        service.checkPrompt('15-летняя школьница')
      ).toThrow(UnsafePromptError);
    });

    it('blocks English "14 years old"', () => {
      expect(() =>
        service.checkPrompt('she is 14 years old and attractive')
      ).toThrow(UnsafePromptError);
    });

    it('blocks English "16-year-old"', () => {
      expect(() =>
        service.checkPrompt('a 16-year-old girl')
      ).toThrow(UnsafePromptError);
    });

    it('blocks "ей 13" pattern', () => {
      expect(() =>
        service.checkPrompt('ей 13 лет, она учится в школе')
      ).toThrow(UnsafePromptError);
    });
  });

  describe('blocked prompts — length limit', () => {
    it('blocks prompts exceeding 2000 characters', () => {
      const longPrompt = 'А'.repeat(2001);
      expect(() => service.checkPrompt(longPrompt)).toThrow(UnsafePromptError);
    });

    it('passes a prompt of exactly 2000 characters', () => {
      const maxPrompt = 'А'.repeat(2000);
      expect(() => service.checkPrompt(maxPrompt)).not.toThrow();
    });
  });

  describe('UnsafePromptError properties', () => {
    it('has correct error name and message', () => {
      let caught: unknown;
      try {
        service.checkPrompt('child porn');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(UnsafePromptError);
      const err = caught as UnsafePromptError;
      expect(err.name).toBe('UnsafePromptError');
      expect(err.reason).toContain('child porn');
    });
  });
});
