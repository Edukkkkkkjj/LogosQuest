/**
 * Monta o `ContentBundle` de um idioma a partir dos arquivos declarativos de /content.
 * Função pura: usada pelo app, pelo validador de conteúdo e pelos testes.
 */
import type {
  ContentBundle, ContextCase, Course, CultureWindow, ErrorHuntCase, Glyph, Language, Lesson,
  LessonStep, Level, Lexeme, MasteryDimension, RootFamily, RootInfo, Secret, Skill, Text, TextNote, Verse,
} from '../types/content'
import { expandTemplate, type LessonTemplate, type NoteSpec } from './templates'

export interface RawLesson {
  id: string
  title: string
  kind: string
  goal: string
  newItems: string[]
  reviewItems: string[]
  template?: string
  textId?: string
  observe?: NoteSpec
  rule?: NoteSpec
  steps?: unknown[]
}

interface RawSkill {
  id: string
  title: string
  description: string
  dimensions: string[]
  itemIds: string[]
}

interface RawUnit {
  id: string
  title: string
  summary: string
  why: string
  masteryThreshold: number
  skills: RawSkill[]
  lessons: RawLesson[]
}

interface RawLevel {
  id: string
  number: number
  title: string
  summary: string
  status: string
  units: RawUnit[]
}

export interface RawCourse {
  title: string
  tagline: string
  levels: RawLevel[]
}

interface RawLexemeGen {
  id: string
  lemma: string
  translit: string
  pos: string
  strong?: string
}

export interface RawLexemePt {
  glosses: string[]
  lemma?: string
  speak?: string
  root?: RootInfo
  usageNote?: string
  windowIds?: string[]
}

export interface RawOverlay {
  title: string
  genre: string
  tier: number
  isPrayer: boolean
  unlockAfterUnitId?: string
  intro: string
  sourceIds: string[]
  secretIds: string[]
  windowIds: string[]
  translations: string[]
  glosses: string[][]
  notes: unknown[]
}

export interface RawGeneratedText {
  id: string
  languageId: string
  ref: string
  verses: unknown[]
}

export interface RawExtras {
  secrets: unknown[]
  windows: unknown[]
  rootFamilies: unknown[]
  contexts: Record<string, { translation: string; sense: string }>
  errorHunts: unknown[]
}

export interface RawContent {
  course: unknown
  glyphs: unknown
  lexemesGenerated: unknown
  lexemesPt: unknown
  extras: unknown
  contextsGenerated: unknown
  texts: { generated: unknown; overlay: unknown }[]
}

/** Problemas encontrados ao montar o pacote; o validador os transforma em erros. */
export interface BuildIssue {
  where: string
  message: string
}

export function buildBundle(language: Language, raw: RawContent, issues: BuildIssue[] = []): ContentBundle {
  const languageId = language.id
  const course = raw.course as RawCourse
  const extras = raw.extras as RawExtras

  const glyphs = (raw.glyphs as Omit<Glyph, 'languageId'>[]).map((g) => ({ ...g, languageId }) as Glyph)

  const pt = raw.lexemesPt as Record<string, RawLexemePt>
  const lexemes: Lexeme[] = (raw.lexemesGenerated as RawLexemeGen[]).map((g) => {
    const cur = pt[g.id]
    if (!cur) issues.push({ where: g.id, message: 'lexema sem glosa em lexemes.pt.json' })
    return {
      kind: 'lexeme', languageId, id: g.id,
      lemma: cur?.lemma ?? g.lemma,
      translit: g.translit, pos: g.pos, strong: g.strong,
      glosses: cur?.glosses ?? [],
      speak: cur?.speak, root: cur?.root, usageNote: cur?.usageNote, windowIds: cur?.windowIds,
    }
  })
  for (const id of Object.keys(pt))
    if (!lexemes.some((l) => l.id === id)) issues.push({ where: id, message: 'glosa para lexema que não existe nos dados gerados' })

  const skills: Skill[] = []
  const lessons: Lesson[] = []
  const levels: Level[] = course.levels.map((lv) => ({
    id: lv.id, number: lv.number, title: lv.title, summary: lv.summary,
    status: lv.status === 'available' ? 'available' : 'planned',
    units: lv.units.map((u) => {
      for (const s of u.skills)
        skills.push({
          id: s.id, languageId, title: s.title, description: s.description,
          targets: s.itemIds.flatMap((itemId) => s.dimensions.map((d) => ({ itemId, dimension: d as MasteryDimension }))),
        })
      for (const l of u.lessons)
        lessons.push({
          id: l.id, languageId, unitId: u.id, title: l.title, goal: l.goal,
          kind: l.kind === 'boss' ? 'boss' : 'lesson',
          newItems: l.newItems, reviewItems: l.reviewItems,
          steps: l.steps ? (l.steps as LessonStep[]) : expandTemplate((l.template ?? 'vocab') as LessonTemplate, l),
        })
      return {
        id: u.id, title: u.title, summary: u.summary, why: u.why, masteryThreshold: u.masteryThreshold,
        skillIds: u.skills.map((s) => s.id), lessonIds: u.lessons.map((l) => l.id),
      }
    }),
  }))

  const texts: Text[] = raw.texts.map(({ generated, overlay }) => {
    const g = generated as RawGeneratedText
    const o = overlay as RawOverlay
    const verses = (g.verses as Omit<Verse, 'translation'>[]).map((v, vi) => {
      const glosses = o.glosses[vi] ?? []
      if (glosses.length !== v.words.length)
        issues.push({ where: `${g.id} ${v.osis}`, message: `${glosses.length} glosas para ${v.words.length} palavras` })
      if (!o.translations[vi]) issues.push({ where: `${g.id} ${v.osis}`, message: 'versículo sem tradução' })
      return {
        ...v,
        translation: o.translations[vi] ?? '',
        words: v.words.map((w, wi) => ({ ...w, gloss: glosses[wi] })),
      }
    })
    return {
      id: g.id, languageId, ref: g.ref, title: o.title, genre: o.genre as Text['genre'], tier: o.tier,
      isPrayer: o.isPrayer, intro: o.intro, verses, notes: o.notes as TextNote[],
      secretIds: o.secretIds, windowIds: o.windowIds, sourceIds: o.sourceIds, unlockAfterUnitId: o.unlockAfterUnitId,
    }
  })
  texts.sort((a, b) => a.tier - b.tier)

  const contextCases: ContextCase[] = (raw.contextsGenerated as Omit<ContextCase, 'languageId' | 'translation' | 'sense'>[]).map((c) => {
    const cur = extras.contexts[c.id]
    if (!cur) issues.push({ where: c.id, message: 'contexto sem tradução/sentido em extras.json' })
    return { ...c, languageId, translation: cur?.translation ?? '', sense: cur?.sense ?? '' }
  })

  const withLang = <T>(list: unknown[]): T[] => list.map((x) => ({ ...(x as object), languageId }) as T)

  return {
    language,
    course: { languageId, title: course.title, tagline: course.tagline, levels } satisfies Course,
    skills, lessons, glyphs, lexemes, texts,
    secrets: withLang<Secret>(extras.secrets),
    windows: withLang<CultureWindow>(extras.windows),
    rootFamilies: withLang<RootFamily>(extras.rootFamilies),
    contextCases,
    errorHunts: withLang<ErrorHuntCase>(extras.errorHunts),
  }
}
