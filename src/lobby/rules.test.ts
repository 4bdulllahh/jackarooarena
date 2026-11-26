import { describe, expect, it } from 'vitest';
import { RULES } from './rules';

describe('How to play pages', () => {
  it('each page fits the phone screen', () => {
    for (const page of RULES) expect(page.length).toBeLessThanOrEqual(150);
  });

  it('uses plain punctuation (no long dashes or ellipsis characters)', () => {
    for (const page of RULES) expect(page).not.toMatch(/[\u2013\u2014\u2026]/);
  });
});
