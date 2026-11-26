// Preset reactions players can throw at each other. Ids are what goes over the network.
export const TAUNTS = [
  { id: 'laugh', label: '😂 Hahaha' },
  { id: 'yalla', label: 'Yalla!' },
  { id: 'facepalm', label: '🤦 Facepalm' },
  { id: 'khalas', label: 'Khalas!' },
  { id: 'clap', label: '👏 Clap clap' },
  { id: 'fire', label: '🔥 Too easy' },
] as const;

export type TauntId = (typeof TAUNTS)[number]['id'];

export const isTaunt = (id: unknown): id is TauntId => TAUNTS.some((t) => t.id === id);
export const tauntLabel = (id: TauntId): string => TAUNTS.find((t) => t.id === id)!.label;

/** True if a play knocked any marble back to base (bots like to gloat about that). */
export const killed = (before: readonly number[], after: readonly number[]): boolean =>
  after.some((pos, m) => pos < 0 && before[m]! >= 0);
