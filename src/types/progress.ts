/**
 * Dados do usuário (mutáveis, gravados no IndexedDB).
 * Todo registro tem `updatedAt` para permitir sincronização futura
 * por "última escrita vence" sem mudar o esquema.
 */
import type { GeneratorId, LanguageId, MasteryDimension } from './content'

export type MasteryState = 'unseen' | 'learning' | 'familiar' | 'review' | 'mastered'

/** Estado FSRS de um cartão (espelha ts-fsrs, com datas em epoch ms). */
export interface ReviewCard {
  due: number
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
  state: number
  lastReview?: number
}

export interface ErrorContext {
  at: number
  generator: GeneratorId
  /** o que o usuário respondeu (id de item ou texto) */
  chosen?: string
  lessonId?: string
}

export interface MasteryRecord {
  /** `${itemId}|${dimension}` */
  id: string
  itemId: string
  languageId: LanguageId
  dimension: MasteryDimension
  exposures: number
  correct: number
  incorrect: number
  streak: number
  totalMs: number
  /** 0–1, média móvel exponencial do acerto */
  confidence: number
  /** dificuldade percebida informada pelo usuário (média 1–4), 0 = nunca informada */
  perceivedDifficulty: number
  lastSeen: number
  card: ReviewCard
  recentErrors: ErrorContext[]
  updatedAt: number
}

export interface ExerciseAttempt {
  id?: number
  at: number
  languageId: LanguageId
  generator: GeneratorId
  itemId: string
  dimension: MasteryDimension
  correct: boolean
  ms: number
  hintUsed: boolean
  chosen?: string
  lessonId?: string
}

export interface LessonProgress {
  lessonId: string
  languageId: LanguageId
  completions: number
  bestAccuracy: number
  lastCompleted: number
  updatedAt: number
}

export interface TextProgress {
  textId: string
  languageId: LanguageId
  reads: number
  readsWithoutTranslit: number
  lastRead: number
  updatedAt: number
}

export interface DailyStats {
  /** AAAA-MM-DD (data local) */
  day: string
  xp: number
  exercises: number
  correct: number
  listeningMs: number
  studyMs: number
  newItems: number
  updatedAt: number
}

export interface AchievementUnlock {
  id: string
  at: number
}

/** Lição em andamento, para "continuar exatamente de onde parou". */
export interface SessionState {
  /** `${languageId}:${lessonId}` ou `${languageId}:review` */
  id: string
  languageId: LanguageId
  lessonId: string
  seed: number
  stepIndex: number
  results: { correct: number; total: number }
  startedAt: number
  updatedAt: number
}

export interface Settings {
  textScale: number
  showTranslit: boolean
  theme: 'auto' | 'light' | 'dark'
  pronunciation: Record<LanguageId, string>
  audioRate: number
  reducedMotion: boolean
  lastLanguage?: LanguageId
}

export interface Profile {
  deviceId: string
  createdAt: number
  xp: number
  settings: Settings
  updatedAt: number
}

export interface ProgressExport {
  app: 'logosquest'
  schema: number
  exportedAt: number
  profile: Profile
  mastery: MasteryRecord[]
  attempts: ExerciseAttempt[]
  lessons: LessonProgress[]
  texts: TextProgress[]
  daily: DailyStats[]
  achievements: AchievementUnlock[]
  sessions: SessionState[]
}
