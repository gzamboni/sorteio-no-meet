import type { Participant } from './participants';

export type HistoryEntry = { n: number; name: string; time: Date };

type Fill = (buf: Uint32Array) => unknown;

/** Unbiased integer in [0, n) via rejection sampling over crypto randomness. */
export function randomIndex(n: number, fill: Fill = (b) => crypto.getRandomValues(b)): number {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  const limit = 2 ** 32 - (2 ** 32 % n);
  const buf = new Uint32Array(1);
  do fill(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

/** drawn/excluded hold names, not ids: Meet issues a new id when someone rejoins. */
export function eligible(
  ps: Participant[],
  drawn: ReadonlySet<string>,
  excluded: ReadonlySet<string> = new Set(),
): Participant[] {
  return ps.filter((p) => !excluded.has(p.key) && !drawn.has(p.key));
}

export function pick<T>(pool: readonly T[], fill?: Fill): T {
  if (!pool.length) throw new RangeError('empty pool');
  return pool[randomIndex(pool.length, fill)];
}
