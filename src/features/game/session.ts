/**
 * Monta a fila de telas de uma lição, de uma revisão ou de uma prática.
 * Determinística: a mesma semente refaz a mesma fila, o que permite retomar
 * uma lição exatamente no ponto em que o navegador foi fechado.
 */
import type { ContentIndex } from '../../data'
import { createRng } from '../../lib/rng'
import type { GeneratorId, Lesson, SkillTarget } from '../../types/content'
import type { Exercise } from '../../types/exercise'
import type { MasteryRecord } from '../../types/progress'
import { masteryId } from '../progress/mastery'
import { isDue } from '../review/srs'
import { generate, type GenCtx } from './generators'
import { isGlyph } from './generators/core'

export type Screen =
  | { type: 'note'; style: 'observe' | 'rule' | 'why'; title: string; body: string; example?: string }
  | { type: 'teach'; itemId: string }
  | { type: 'exercise'; exercise: Exercise }
  | { type: 'read'; textId: string }

export interface SessionOptions {
  seed: number
  modelId: string
  audioAvailable: boolean
}

function context(index: ContentIndex, o: SessionOptions): GenCtx {
  return { index, rng: createRng(o.seed), modelId: o.modelId, audioAvailable: o.audioAvailable }
}

export function buildLessonScreens(lesson: Lesson, index: ContentIndex, o: SessionOptions): Screen[] {
  const ctx = context(index, o)
  const screens: Screen[] = []
  for (const step of lesson.steps) {
    switch (step.type) {
      case 'note':
        screens.push({ type: 'note', style: step.style, title: step.title, body: step.body, example: step.example })
        break
      case 'teach':
        for (const itemId of step.itemIds) screens.push({ type: 'teach', itemId })
        break
      case 'read':
        screens.push({ type: 'read', textId: step.textId })
        break
      case 'exercise': {
        const itemIds = step.itemIds ?? (lesson.newItems.length ? lesson.newItems : lesson.reviewItems)
        const list = generate(ctx, step.generator, { itemIds, count: step.count, textId: step.textId, variant: step.variant })
        for (const exercise of list) screens.push({ type: 'exercise', exercise })
        break
      }
    }
  }
  return screens
}

/** Qual exercício treina cada par item+dimensão, em ordem de preferência. */
function generatorsFor(index: ContentIndex, t: SkillTarget): GeneratorId[] {
  const glyph = isGlyph(index.items.get(t.itemId))
  if (glyph) return t.dimension === 'audio' ? ['listenChoose'] : ['nameChoose', 'findLetter']
  switch (t.dimension) {
    case 'meaning': return ['meaningChoose']
    case 'audio': return ['listenChoose']
    case 'reading': return ['orderLetters', 'readAloud']
    case 'morphology': return ['whoAmI', 'correctForm', 'meaningChoose']
    case 'form': return ['whoAmI', 'meaningChoose']
    case 'lexeme': return ['rootHunt', 'meaningChoose']
  }
}

/** Prática livre e revisão espaçada: um exercício por alvo, misturados (interleaving). */
export function buildPracticeScreens(targets: SkillTarget[], index: ContentIndex, o: SessionOptions): Screen[] {
  const ctx = context(index, o)
  const screens: Screen[] = []
  targets.forEach((t, i) => {
    const options = generatorsFor(index, t)
    const ordered = [...options.slice(i % options.length), ...options.slice(0, i % options.length)]
    for (const g of ordered) {
      const wanted = generate(ctx, g, { itemIds: [t.itemId], count: 1 }).find((e) => e.targets.some((x) => x.itemId === t.itemId))
      if (wanted) {
        screens.push({ type: 'exercise', exercise: wanted })
        break
      }
    }
  })
  return ctx.rng.shuffle(screens)
}

/** Alvos com revisão vencida no FSRS, os mais atrasados primeiro. */
export function dueTargets(mastery: Map<string, MasteryRecord>, languageId: string, now: number, limit: number): SkillTarget[] {
  return [...mastery.values()]
    .filter((r) => r.languageId === languageId && isDue(r.card, now))
    .sort((a, b) => a.card.due - b.card.due)
    .slice(0, limit)
    .map((r) => ({ itemId: r.itemId, dimension: r.dimension }))
}

/** Alvos de menor confiança entre os informados (para "praticar esta unidade"). */
export function weakestTargets(targets: SkillTarget[], mastery: Map<string, MasteryRecord>, limit: number): SkillTarget[] {
  const conf = (t: SkillTarget) => mastery.get(masteryId(t.itemId, t.dimension))?.confidence ?? 0
  return [...targets].sort((a, b) => conf(a) - conf(b)).slice(0, limit)
}

/**
 * Antifrustração: depois de um erro, o exercício volta mais fácil — menos
 * opções (a certa e a que foi escolhida), sem letras sobrando, com a pista à vista.
 */
export function easierRetry(ex: Exercise, chosen?: string): Exercise {
  const id = `${ex.id}-retry`
  switch (ex.kind) {
    case 'choice': {
      const correct = ex.options.find((o) => o.correct)!
      const picked = ex.options.find((o) => o.id === chosen && !o.correct) ?? ex.options.find((o) => !o.correct)!
      const two = ex.options.filter((o) => o === correct || o === picked)
      return { ...ex, id, retry: true, options: two }
    }
    case 'assemble': {
      const needed = [...ex.answer]
      const tiles = ex.tiles.filter((t) => {
        const i = needed.indexOf(t)
        if (i < 0) return false
        needed.splice(i, 1)
        return true
      })
      return { ...ex, id, retry: true, tiles }
    }
    default:
      return { ...ex, id, retry: true }
  }
}
