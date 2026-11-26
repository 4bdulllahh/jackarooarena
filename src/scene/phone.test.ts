import { describe, expect, it } from 'vitest';
import { SCREEN, layout } from './phone';

describe('phone layout', () => {
  it('fits the fullest screen (the room: title, copy link, 4 seats, start, message)', () => {
    const rows = layout(['title', 'control', 'control', 'control', 'control', 'control', 'control', 'text']);
    const last = rows.at(-1)!;
    expect(last.y + last.h).toBeLessThanOrEqual(SCREEN.h);
    rows.slice(1).forEach((r, i) => expect(r.y).toBeGreaterThanOrEqual(rows[i]!.y + rows[i]!.h));
  });
});
