export const XP_PER_LEVEL = 250;

export interface Progress {
  readonly level: number;
  readonly rank: string;
  /** XP earned inside the current level. */
  readonly xpInLevel: number;
  readonly xpForNext: number;
  /** Cashback rate as a percentage (1–5). */
  readonly cashback: number;
}

const RANKS: readonly [minLevel: number, name: string][] = [
  [30, 'Leyenda'],
  [20, 'Veterano'],
  [10, 'Estratega'],
  [5, 'Explorador'],
  [1, 'Novato'],
];

/** Cashback grows one point every 7 levels and maxes out at level 30. */
export function cashbackFor(level: number): number {
  return level >= 30 ? 5 : Math.min(4, 1 + Math.floor((level - 1) / 7));
}

export function progressFor(totalXp: number): Progress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return {
    level,
    rank: RANKS.find(([min]) => level >= min)![1],
    xpInLevel: xp % XP_PER_LEVEL,
    xpForNext: XP_PER_LEVEL,
    cashback: cashbackFor(level),
  };
}
