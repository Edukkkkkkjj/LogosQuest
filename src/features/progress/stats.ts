/** Estatísticas do perfil, cobertura de textos e conquistas. Funções puras. */
import type { AchievementDef, ContentBundle, LanguageId, Text } from '../../types/content'
import type { DailyStats, LessonProgress, MasteryRecord, TextProgress } from '../../types/progress'
import { itemConfidence, stateOf } from './mastery'
import { isDue } from '../review/srs'

export function dayKey(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const DAY = 86_400_000

/** Dias seguidos com estudo, contando hoje ou, se hoje ainda não houve, até ontem. */
export function streak(daily: DailyStats[], now: number): number {
  const days = new Set(daily.filter((d) => d.exercises > 0).map((d) => d.day))
  let cursor = now
  if (!days.has(dayKey(cursor))) cursor -= DAY
  let n = 0
  while (days.has(dayKey(cursor))) {
    n++
    cursor -= DAY
  }
  return n
}

export const KNOWN_THRESHOLD = 0.5

/** Um lexema é "conhecido" se alguma dimensão de reconhecimento passou de 0,5. */
export function isKnown(mastery: Map<string, MasteryRecord>, itemId: string): boolean {
  return itemConfidence(mastery, itemId, ['meaning', 'reading', 'form', 'morphology']) >= KNOWN_THRESHOLD
}

export interface Coverage {
  total: number
  known: number
  ratio: number
  newLexemeIds: string[]
}

/** "Você já conhece 90% das palavras desta passagem": conta ocorrências, não lexemas. */
export function textCoverage(text: Text, mastery: Map<string, MasteryRecord>): Coverage {
  let total = 0
  let known = 0
  const unknown = new Set<string>()
  for (const v of text.verses)
    for (const w of v.words) {
      const stem = w.segments.find((s) => s.role === 'stem')?.lexemeId
      if (!stem) continue
      total++
      if (isKnown(mastery, stem)) known++
      else unknown.add(stem)
    }
  return { total, known, ratio: total ? known / total : 0, newLexemeIds: [...unknown] }
}

export interface Summary {
  lettersTotal: number
  lettersFamiliar: number
  wordsFamiliar: number
  formsRecognized: number
  dueCount: number
  overall: number
  byState: Record<string, number>
}

export function summarize(bundle: ContentBundle, mastery: Map<string, MasteryRecord>, now: number): Summary {
  const letters = bundle.glyphs.filter((g) => g.kind === 'letter')
  const lettersFamiliar = letters.filter((g) => itemConfidence(mastery, g.id, ['form']) >= KNOWN_THRESHOLD).length
  const wordsFamiliar = bundle.lexemes.filter((l) => isKnown(mastery, l.id)).length
  let formsRecognized = 0
  let dueCount = 0
  const byState: Record<string, number> = { learning: 0, familiar: 0, review: 0, mastered: 0 }
  for (const r of mastery.values()) {
    if (r.languageId !== bundle.language.id) continue
    if (r.dimension === 'morphology' && r.confidence >= KNOWN_THRESHOLD) formsRecognized++
    if (isDue(r.card, now)) dueCount++
    const s = stateOf(r, now)
    if (s !== 'unseen') byState[s]++
  }
  const targets = bundle.skills.flatMap((s) => s.targets)
  const overall = targets.length
    ? targets.reduce((sum, t) => sum + (mastery.get(`${t.itemId}|${t.dimension}`)?.confidence ?? 0), 0) / targets.length
    : 0
  return { lettersTotal: letters.length, lettersFamiliar, wordsFamiliar, formsRecognized, dueCount, overall, byState }
}

export interface AchievementSnapshot {
  lessons: LessonProgress[]
  texts: TextProgress[]
  daily: DailyStats[]
  mastery: MasteryRecord[]
  /** ids de textos que são orações */
  prayerTextIds: Set<string>
  /** tipo de cada item conhecido: 'letter' | 'lexeme' */
  kindOf: (itemId: string) => 'letter' | 'lexeme' | 'other'
  now: number
}

function familiarCount(s: AchievementSnapshot, kind: 'letter' | 'lexeme', languageId?: LanguageId): number {
  const seen = new Set<string>()
  for (const r of s.mastery)
    if (r.confidence >= KNOWN_THRESHOLD && s.kindOf(r.itemId) === kind && (!languageId || r.languageId === languageId)) seen.add(r.itemId)
  return seen.size
}

export function achievementEarned(def: AchievementDef, s: AchievementSnapshot): boolean {
  const r = def.rule
  switch (r.type) {
    case 'lessons':
      return s.lessons.filter((l) => l.completions > 0).length >= r.count
    case 'itemsFamiliar':
      return familiarCount(s, r.kind, r.languageId) >= r.count
    case 'textsRead':
      return s.texts.filter((t) => t.reads > 0 && (!r.prayer || s.prayerTextIds.has(t.textId))).length >= r.count
    case 'streak':
      return streak(s.daily, s.now) >= r.days
    case 'reviews':
      return s.daily.reduce((n, d) => n + d.exercises, 0) >= r.count
    case 'noTranslitRead':
      return s.texts.some((t) => t.readsWithoutTranslit > 0)
    case 'bothLanguages':
      return new Set(s.lessons.filter((l) => l.completions > 0).map((l) => l.languageId)).size >= 2
  }
}

/** Nível do jogador a partir do XP: cada nível custa um pouco mais que o anterior. */
export function playerLevel(xp: number): { level: number; into: number; span: number } {
  let level = 1
  let span = 100
  let rest = xp
  while (rest >= span) {
    rest -= span
    level++
    span = Math.round(span * 1.25)
  }
  return { level, into: rest, span }
}
