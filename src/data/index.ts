/**
 * Ponto de entrada do conteúdo. O conteúdo de cada idioma é um chunk separado,
 * carregado só quando o usuário entra naquele curso.
 */
import achievementsJson from '../../content/shared/achievements.json'
import languagesJson from '../../content/shared/languages.json'
import sourcesJson from '../../content/shared/sources.json'
import type { AchievementDef, ContentBundle, Language, LanguageId, LearningItem, SourceEntry, Text, WordOccurrence } from '../types/content'
import { buildBundle, type BuildIssue } from './build'

export const LANGUAGES = languagesJson as Language[]
export const SOURCES = sourcesJson as SourceEntry[]
export const ACHIEVEMENTS = achievementsJson as AchievementDef[]

export function getLanguage(id: LanguageId): Language {
  const l = LANGUAGES.find((x) => x.id === id)
  if (!l) throw new Error(`idioma desconhecido: ${id}`)
  return l
}

export function isLanguageId(x: string | undefined): x is LanguageId {
  return LANGUAGES.some((l) => l.id === x)
}

const cache = new Map<LanguageId, Promise<ContentBundle>>()

export function loadBundle(id: LanguageId, issues?: BuildIssue[]): Promise<ContentBundle> {
  if (issues) return importRaw(id).then((raw) => buildBundle(getLanguage(id), raw, issues))
  let p = cache.get(id)
  if (!p) {
    p = importRaw(id).then((raw) => buildBundle(getLanguage(id), raw))
    cache.set(id, p)
  }
  return p
}

async function importRaw(id: LanguageId) {
  return id === 'hebrew' ? (await import('./hebrew')).raw : (await import('./greek')).raw
}

export interface OccurrenceRef {
  text: Text
  verseIndex: number
  wordIndex: number
  word: WordOccurrence
}

/** Índices derivados do pacote, calculados uma vez por idioma. */
export interface ContentIndex {
  bundle: ContentBundle
  items: Map<string, LearningItem>
  occurrences: OccurrenceRef[]
  /** ocorrências por lexema (qualquer segmento) */
  byLexeme: Map<string, OccurrenceRef[]>
}

const indexCache = new WeakMap<ContentBundle, ContentIndex>()

export function indexOf(bundle: ContentBundle): ContentIndex {
  let idx = indexCache.get(bundle)
  if (idx) return idx
  const items = new Map<string, LearningItem>()
  for (const g of bundle.glyphs) items.set(g.id, g)
  for (const l of bundle.lexemes) items.set(l.id, l)
  const occurrences: OccurrenceRef[] = []
  const byLexeme = new Map<string, OccurrenceRef[]>()
  for (const text of bundle.texts)
    text.verses.forEach((verse, verseIndex) =>
      verse.words.forEach((word, wordIndex) => {
        const ref = { text, verseIndex, wordIndex, word }
        occurrences.push(ref)
        for (const seg of word.segments)
          if (seg.lexemeId) {
            const list = byLexeme.get(seg.lexemeId) ?? []
            list.push(ref)
            byLexeme.set(seg.lexemeId, list)
          }
      }),
    )
  idx = { bundle, items, occurrences, byLexeme }
  indexCache.set(bundle, idx)
  return idx
}
