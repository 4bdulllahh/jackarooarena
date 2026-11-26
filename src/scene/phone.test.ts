import { describe, expect, it } from 'vitest';
import { SCREEN, layout } from './phone';

describe('phone layout', () => {
  it('fits the fullest screen (the room: title, copy link, 4 seats, start, message)', () => {
    const kinds = [
      'title',
      'control',
      'control',
      'control',
      'control',
      'control',
      'control',
      'text',
    ] as const;
    const rows = layout(kinds.map((kind) => ({ kind })));
    const last = rows.at(-1)!;
    expect(last.y + last.h).toBeLessThanOrEqual(SCREEN.h);
    rows.slice(1).forEach((r, i) => expect(r.y).toBeGreaterThanOrEqual(rows[i]!.y + rows[i]!.h));
  });

  it('fits a How to play page of 9 lines with Next and Back', () => {
    const rows = layout([
      { kind: 'title' },
      { kind: 'para', lines: 9 },
      { kind: 'control' },
      { kind: 'control' },
    ]);
    expect(rows[1]!.h).toBe(94);
    expect(rows.at(-1)!.y + rows.at(-1)!.h).toBeLessThanOrEqual(SCREEN.h);
  });
});
