/** Contexto e utilitários comuns aos geradores de exercícios. */
import type { ContentIndex, OccurrenceRef } from '../../../data'
import type { Rng } from '../../../lib/rng'
import type { GeneratorId, Glyph, LearningItem, Lexeme, Segment } from '../../../types/content'
import type { AudioRef, ChoiceExercise, ChoiceOption, Display, Exercise } from '../../../types/exercise'

export interface GenCtx {
  index: ContentIndex
  rng: Rng
  /** modelo de pronúncia em uso (para as descrições de som) */
  modelId: string
  /** falso = não há voz/gravação: exercícios de escuta viram equivalentes visuais */
  audioAvailable: boolean
}

export interface GenParams {
  itemIds: string[]
  count?: number
  textId?: string
  variant?: string
}

export type Generator = (ctx: GenCtx, p: GenParams) => Exercise[]

let counter = 0
export const exId = (g: GeneratorId) => `${g}-${++counter}`

export const isGlyph = (i: LearningItem | undefined): i is Glyph => !!i && i.kind !== 'lexeme'
export const isLexeme = (i: LearningItem | undefined): i is Lexeme => !!i && i.kind === 'lexeme'

export function glyphs(ctx: GenCtx, ids: string[]): Glyph[] {
  return ids.map((id) => ctx.index.items.get(id)).filter(isGlyph)
}

export function lexemes(ctx: GenCtx, ids: string[]): Lexeme[] {
  return ids.map((id) => ctx.index.items.get(id)).filter(isLexeme)
}

export function script(item: LearningItem): string {
  return item.kind === 'lexeme' ? item.lemma : item.display
}

export function audioOf(item: LearningItem): AudioRef {
  if (item.kind === 'lexeme')
    return { languageId: item.languageId, itemId: item.id, text: item.speak ?? item.lemma, level: 'word' }
  return { languageId: item.languageId, itemId: item.id, text: item.speak, level: 'phoneme' }
}

export function scriptDisplay(item: LearningItem, withAudio = true): Display {
  return { text: script(item), script: true, audio: withAudio ? audioOf(item) : undefined }
}

export function glyphLabel(g: Glyph): string {
  return g.translit ? `${g.name} (${g.translit})` : g.name
}

export function soundOf(g: Glyph, modelId: string): string {
  return g.sound[modelId] ?? Object.values(g.sound)[0] ?? ''
}

/** Escolhe até `count` itens, sem repetir, em ordem embaralhada. */
export function take<T>(ctx: GenCtx, list: T[], count?: number): T[] {
  return ctx.rng.sample(list, Math.min(count ?? list.length, list.length))
}

/**
 * Distratores: primeiro os itens que o conteúdo marca como confundíveis,
 * depois os da própria lição, depois quaisquer do mesmo tipo.
 */
export function distractors(ctx: GenCtx, target: LearningItem, pool: LearningItem[], n: number, byEar = false): LearningItem[] {
  const out: LearningItem[] = []
  const seen = new Set([target.id])
  const clash = (a: LearningItem) =>
    script(a) === script(target) || isGlyph(a) !== isGlyph(target) ||
    // de ouvido, cada opção precisa soar diferente do alvo e das demais
    (byEar && (!soundsDifferent(a, target) || out.some((o) => !soundsDifferent(a, o))))
  const add = (list: (LearningItem | undefined)[]) => {
    for (const i of list) {
      if (out.length >= n) return
      if (!i || seen.has(i.id) || clash(i)) continue
      seen.add(i.id)
      out.push(i)
    }
  }
  if (isGlyph(target)) add(ctx.rng.shuffle(target.confusables.map((id) => ctx.index.items.get(id))))
  add(ctx.rng.shuffle(pool))
  const everything: LearningItem[] = isGlyph(target) ? ctx.index.bundle.glyphs : ctx.index.bundle.lexemes
  add(ctx.rng.shuffle(everything.filter((i) => i.kind === target.kind)))
  add(ctx.rng.shuffle(everything))
  return out
}

/** Sinais sem som próprio (acentos, espíritos, dagesh) não servem para exercícios de escuta. */
export function hasOwnSound(item: LearningItem): boolean {
  return item.kind !== 'mark'
}

/** Duas opções só podem disputar um exercício de escuta se soarem diferente. */
export function soundsDifferent(a: LearningItem, b: LearningItem): boolean {
  if (!hasOwnSound(a) || !hasOwnSound(b)) return false
  if (a.kind === 'vowel' && b.kind === 'vowel') return a.translit !== b.translit
  return audioOf(a).text !== audioOf(b).text
}

export function choice(
  ctx: GenCtx, base: Omit<ChoiceExercise, 'kind' | 'id' | 'options' | 'languageId'>, correct: Omit<ChoiceOption, 'correct'>,
  wrong: Omit<ChoiceOption, 'correct'>[],
): ChoiceExercise {
  return {
    ...base, kind: 'choice', id: exId(base.generator), languageId: ctx.index.bundle.language.id,
    options: ctx.rng.shuffle([{ ...correct, correct: true }, ...wrong.map((w) => ({ ...w, correct: false }))]),
  }
}

/** Segmento principal (a "palavra" sem prefixos e sufixos) de uma ocorrência. */
export function stemOf(o: OccurrenceRef): Segment | undefined {
  return o.word.segments.find((s) => s.role === 'stem')
}

export function verseText(o: OccurrenceRef): string {
  return o.text.verses[o.verseIndex].words.map((w) => w.surface).join(' ').replace(/־ /g, '־')
}

export function occurrencesIn(ctx: GenCtx, textId?: string): OccurrenceRef[] {
  return textId ? ctx.index.occurrences.filter((o) => o.text.id === textId) : ctx.index.occurrences
}
