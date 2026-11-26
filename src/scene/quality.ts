// Graphics settings: Low keeps weak PCs at 60 fps, Medium and High add shadows, glow and smoother edges.
export type Quality = 'low' | 'medium' | 'high';

export interface Preset {
  pixelRatio: number; // the most screen pixels per CSS pixel we render (hi-DPI screens)
  shadows: number; // shadow map size, 0 = blob shadows only
  bloom: boolean;
  samples: number; // MSAA samples
}

export const PRESETS: Record<Quality, Preset> = {
  low: { pixelRatio: 1, shadows: 0, bloom: false, samples: 0 },
  medium: { pixelRatio: 1.5, shadows: 1024, bloom: true, samples: 4 },
  high: { pixelRatio: 2, shadows: 2048, bloom: true, samples: 4 },
};

export const QUALITIES: Quality[] = ['low', 'medium', 'high'];
const isQuality = (q: unknown): q is Quality => QUALITIES.includes(q as Quality);

/** The saved setting; `?q=low` in the URL overrides it for testing. */
export function getQuality(): Quality {
  const url = new URLSearchParams(location.search).get('q');
  if (isQuality(url)) return url;
  const saved = localStorage.getItem('graphics');
  return isQuality(saved) ? saved : 'medium';
}

export function setQuality(quality: Quality): void {
  localStorage.setItem('graphics', quality);
}
