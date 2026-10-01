import { indexOf, loadBundle, type ContentIndex } from '../src/data'
import type { GenCtx } from '../src/features/game/generators'
import { createRng } from '../src/lib/rng'
import type { LanguageId } from '../src/types/content'

export async function index(lang: LanguageId): Promise<ContentIndex> {
  return indexOf(await loadBundle(lang))
}

export function ctx(idx: ContentIndex, seed = 7, audioAvailable = true): GenCtx {
  return { index: idx, rng: createRng(seed), modelId: idx.bundle.language.defaultPronunciationId, audioAvailable }
}
