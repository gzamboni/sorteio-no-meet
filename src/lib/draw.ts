import type { Participant } from './participants';

export type Options = { excludeSelf: boolean; noRepeat: boolean };
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

export function eligible(ps: Participant[], opts: Options, drawn: ReadonlySet<string>): Participant[] {
  return ps.filter((p) => !(opts.excludeSelf && p.isSelf) && !(opts.noRepeat && drawn.has(p.id)));
}

export function pick<T>(pool: readonly T[], fill?: Fill): T {
  if (!pool.length) throw new RangeError('empty pool');
  return pool[randomIndex(pool.length, fill)];
}
