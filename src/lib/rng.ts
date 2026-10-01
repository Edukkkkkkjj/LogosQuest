/** Gerador pseudoaleatório com semente (mulberry32): a mesma semente refaz a mesma lição. */
export interface Rng {
  next(): number
  int(maxExclusive: number): number
  pick<T>(list: readonly T[]): T
  shuffle<T>(list: readonly T[]): T[]
  sample<T>(list: readonly T[], n: number): T[]
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (max: number) => Math.floor(next() * max)
  const shuffle = <T,>(list: readonly T[]): T[] => {
    const out = [...list]
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  return {
    next,
    int,
    pick: (list) => list[int(list.length)],
    shuffle,
    sample: (list, n) => shuffle(list).slice(0, n),
  }
}

export function uniqueBy<T>(list: readonly T[], key: (x: T) => string): T[] {
  const seen = new Set<string>()
  return list.filter((x) => {
    const k = key(x)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
