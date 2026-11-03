import { describe, expect, it } from 'vitest';
import { eligible, pick, randomIndex } from './draw';

const P = (id: string, isSelf = false) => ({ id, name: id, isSelf });
const people = [P('a'), P('b', true), P('c')];

describe('randomIndex', () => {
  it('stays in range and maps raw value modulo n', () => {
    expect(randomIndex(3, (b) => (b[0] = 7))).toBe(1);
    expect(randomIndex(1)).toBe(0);
  });
  it('rejects values in the biased tail', () => {
    const seq = [2 ** 32 - 1, 5]; // 2^32-1 >= limit for n=3 → rejected
    expect(randomIndex(3, (b) => (b[0] = seq.shift()!))).toBe(2);
    expect(seq).toEqual([]);
  });
  it('is roughly uniform with real crypto', () => {
    const c = [0, 0, 0, 0];
    for (let i = 0; i < 20000; i++) c[randomIndex(4)]++;
    for (const n of c) expect(Math.abs(n - 5000)).toBeLessThan(400);
  });
  it('rejects bad n', () => {
    expect(() => randomIndex(0)).toThrow();
    expect(() => pick([])).toThrow();
  });
});

describe('eligible', () => {
  it('includes everyone by default', () => {
    expect(eligible(people, { excludeSelf: false, noRepeat: false }, new Set())).toHaveLength(3);
  });
  it('excludes self', () => {
    expect(eligible(people, { excludeSelf: true, noRepeat: false }, new Set()).map((p) => p.id)).toEqual(['a', 'c']);
  });
  it('excludes drawn only when noRepeat', () => {
    const drawn = new Set(['a']);
    expect(eligible(people, { excludeSelf: false, noRepeat: true }, drawn).map((p) => p.id)).toEqual(['b', 'c']);
    expect(eligible(people, { excludeSelf: false, noRepeat: false }, drawn)).toHaveLength(3);
  });
  it('can end empty', () => {
    expect(eligible(people, { excludeSelf: false, noRepeat: true }, new Set(['a', 'b', 'c']))).toEqual([]);
  });
  it('drawn participant who left is ignored', () => {
    expect(eligible(people, { excludeSelf: false, noRepeat: true }, new Set(['gone']))).toHaveLength(3);
  });
});
