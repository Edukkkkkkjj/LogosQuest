/**
 * Domínio por item e por dimensão. Funções puras: recebem um registro e devolvem outro.
 *
 * Uma palavra pode estar dominada isoladamente (meaning) e ainda ser
 * desconhecida flexionada (morphology) ou de ouvido (audio); por isso cada
 * par item+dimensão tem seu próprio registro.
 */
import type { GeneratorId, LanguageId, MasteryDimension } from '../../types/content'
import type { AnswerResult } from '../../types/exercise'
import type { MasteryRecord, MasteryState } from '../../types/progress'
import { Rating, isDue, newCard, schedule, type Grade } from '../review/srs'

export const masteryId = (itemId: string, dimension: MasteryDimension) => `${itemId}|${dimension}`

/** Ganho da média móvel a cada acerto: 4 acertos seguidos levam a ~0,87. */
const GAIN = 0.4
const GAIN_WITH_HINT = 0.2
const LOSS = 0.55
const SLOW_MS = 12_000
const FAST_MS = 2_500
/** estabilidade FSRS (dias) a partir da qual o item conta como dominado */
export const MASTERED_STABILITY = 21

export function emptyRecord(itemId: string, languageId: LanguageId, dimension: MasteryDimension, now: number): MasteryRecord {
  return {
    id: masteryId(itemId, dimension), itemId, languageId, dimension,
    exposures: 0, correct: 0, incorrect: 0, streak: 0, totalMs: 0, confidence: 0,
    perceivedDifficulty: 0, lastSeen: now, card: newCard(now), recentErrors: [], updatedAt: now,
  }
}

/** Converte uma resposta em nota FSRS. O erro não é punido: só informa o agendamento. */
export function gradeFor(r: AnswerResult): Grade {
  if (!r.correct) return Rating.Again
  if (r.perceived) return ([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[])[r.perceived - 1]
  if (r.hintUsed || r.ms > SLOW_MS) return Rating.Hard
  if (r.ms < FAST_MS) return Rating.Easy
  return Rating.Good
}

export interface AnswerContext {
  now: number
  generator: GeneratorId
  lessonId?: string
}

export function applyAnswer(rec: MasteryRecord, r: AnswerResult, ctx: AnswerContext): MasteryRecord {
  const gain = r.hintUsed ? GAIN_WITH_HINT : GAIN
  const confidence = r.correct ? rec.confidence + gain * (1 - rec.confidence) : rec.confidence * LOSS
  const rated = r.perceived
    ? rec.perceivedDifficulty === 0
      ? 5 - r.perceived
      : rec.perceivedDifficulty * 0.7 + (5 - r.perceived) * 0.3
    : rec.perceivedDifficulty
  return {
    ...rec,
    exposures: rec.exposures + 1,
    correct: rec.correct + (r.correct ? 1 : 0),
    incorrect: rec.incorrect + (r.correct ? 0 : 1),
    streak: r.correct ? rec.streak + 1 : 0,
    totalMs: rec.totalMs + r.ms,
    confidence,
    perceivedDifficulty: rated,
    lastSeen: ctx.now,
    card: schedule(rec.card, gradeFor(r), ctx.now),
    recentErrors: r.correct
      ? rec.recentErrors
      : [...rec.recentErrors, { at: ctx.now, generator: ctx.generator, chosen: r.chosen, lessonId: ctx.lessonId }].slice(-5),
    updatedAt: ctx.now,
  }
}

/** Ver um cartão de apresentação conta como exposição, não como resposta. */
export function applyExposure(rec: MasteryRecord, now: number): MasteryRecord {
  return { ...rec, exposures: rec.exposures + 1, lastSeen: now, updatedAt: now }
}

export function stateOf(rec: MasteryRecord | undefined, now: number): MasteryState {
  if (!rec || rec.exposures === 0) return 'unseen'
  if (rec.confidence < 0.5) return 'learning'
  if (rec.confidence < 0.8) return 'familiar'
  if (isDue(rec.card, now)) return 'review'
  return rec.card.stability >= MASTERED_STABILITY ? 'mastered' : 'familiar'
}

export const STATE_LABEL: Record<MasteryState, string> = {
  unseen: 'ainda não visto', learning: 'aprendendo', familiar: 'familiar', review: 'para revisar', mastered: 'dominado',
}

export const DIMENSION_LABEL: Record<MasteryDimension, string> = {
  lexeme: 'família / lema', form: 'forma', meaning: 'significado', audio: 'escuta', reading: 'leitura', morphology: 'morfologia',
}

/** Melhor confiança de um item em qualquer dimensão (para "palavras conhecidas"). */
export function itemConfidence(mastery: Map<string, MasteryRecord>, itemId: string, dims: MasteryDimension[]): number {
  let best = 0
  for (const d of dims) best = Math.max(best, mastery.get(masteryId(itemId, d))?.confidence ?? 0)
  return best
}

export interface Diagnosis {
  itemId: string
  message: string
}

/**
 * Transforma o histórico de erros em orientação: o erro é informação diagnóstica.
 * `label` devolve o nome exibível de um item (palavra, letra).
 */
export function diagnose(mastery: Map<string, MasteryRecord>, itemId: string, label: (id: string) => string): Diagnosis | null {
  const of = (d: MasteryDimension) => mastery.get(masteryId(itemId, d))
  const meaning = of('meaning')
  const morph = of('morphology')
  const audio = of('audio')
  const form = of('form') ?? of('reading')
  const name = label(itemId)

  if (meaning && morph && meaning.confidence >= 0.7 && morph.confidence < 0.5 && morph.incorrect > 0)
    return { itemId, message: `Você conhece ${name}, mas ainda está confundindo as formas flexionadas dela.` }
  if (form && audio && form.confidence >= 0.7 && audio.confidence < 0.5 && audio.incorrect > 0)
    return { itemId, message: `Você reconhece ${name} por escrito, mas ainda não de ouvido.` }

  const worst = [meaning, morph, audio, form].filter((r): r is MasteryRecord => !!r && r.incorrect > 0).sort((a, b) => b.incorrect - a.incorrect)[0]
  if (!worst) return null
  const counts = new Map<string, number>()
  for (const e of worst.recentErrors) if (e.chosen) counts.set(e.chosen, (counts.get(e.chosen) ?? 0) + 1)
  const top = [...counts].sort((a, b) => b[1] - a[1])[0]
  if (top && top[1] >= 2) return { itemId, message: `Você costuma confundir ${name} com ${label(top[0])}.` }
  return { itemId, message: `${name}: ${worst.incorrect} erro(s) em ${DIMENSION_LABEL[worst.dimension]}. Vale uma revisão.` }
}
