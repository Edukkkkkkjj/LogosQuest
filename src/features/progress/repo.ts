/**
 * Repositório de progresso: toda escrita no banco passa por aqui.
 * Cada operação grava imediatamente (autosave) e avisa os ouvintes.
 */
import { ACHIEVEMENTS } from '../../data'
import { db, type AppDb } from '../../lib/db'
import type { AchievementDef, LanguageId, SkillTarget } from '../../types/content'
import type { AnswerResult, Exercise } from '../../types/exercise'
import type {
  AchievementUnlock, DailyStats, LessonProgress, MasteryRecord, Profile, ProgressExport, SessionState,
  Settings, TextProgress,
} from '../../types/progress'
import { applyAnswer, applyExposure, emptyRecord, masteryId } from './mastery'
import { achievementEarned, dayKey, type AchievementSnapshot } from './stats'

export const SCHEMA_VERSION = 1
export const XP_CORRECT = 10
export const XP_ATTEMPT = 2
export const XP_LESSON = 20
const MAX_BACKUPS = 5

export const DEFAULT_SETTINGS: Settings = {
  textScale: 1,
  showTranslit: true,
  theme: 'auto',
  pronunciation: { hebrew: 'he-academic', greek: 'gr-koine' },
  audioRate: 1,
  reducedMotion: false,
}

type Listener = () => void

export class ProgressRepo {
  private listeners = new Set<Listener>()

  constructor(private readonly d: AppDb = db) {}

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify(): void {
    for (const fn of this.listeners) fn()
  }

  // ---------- perfil ----------

  async profile(): Promise<Profile> {
    const row = await this.d.profile.get('me')
    if (row) return { ...row, settings: { ...DEFAULT_SETTINGS, ...row.settings } }
    const now = Date.now()
    const fresh = { id: 'me' as const, deviceId: crypto.randomUUID(), createdAt: now, xp: 0, settings: DEFAULT_SETTINGS, updatedAt: now }
    await this.d.profile.put(fresh)
    return fresh
  }

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    const p = await this.profile()
    await this.d.profile.put({ ...p, id: 'me', settings: { ...p.settings, ...patch }, updatedAt: Date.now() })
    this.notify()
  }

  private async addXp(xp: number, now: number): Promise<void> {
    const p = await this.profile()
    await this.d.profile.put({ ...p, id: 'me', xp: p.xp + xp, updatedAt: now })
  }

  private async bumpDaily(now: number, patch: Partial<Omit<DailyStats, 'day' | 'updatedAt'>>): Promise<void> {
    const day = dayKey(now)
    const cur = (await this.d.daily.get(day)) ?? { day, xp: 0, exercises: 0, correct: 0, listeningMs: 0, studyMs: 0, newItems: 0, updatedAt: now }
    await this.d.daily.put({
      ...cur,
      xp: cur.xp + (patch.xp ?? 0), exercises: cur.exercises + (patch.exercises ?? 0), correct: cur.correct + (patch.correct ?? 0),
      listeningMs: cur.listeningMs + (patch.listeningMs ?? 0), studyMs: cur.studyMs + (patch.studyMs ?? 0),
      newItems: cur.newItems + (patch.newItems ?? 0), updatedAt: now,
    })
  }

  // ---------- respostas ----------

  /** Registra a resposta a um exercício em todas as dimensões que ele mede. */
  async recordAnswer(ex: Exercise, result: AnswerResult, lessonId?: string, now = Date.now()): Promise<number> {
    return this.recordTargets(ex.targets, ex, result, lessonId, now)
  }

  /** Variante para exercícios com resultado por item (jogo da memória). */
  async recordTargets(
    targets: SkillTarget[], ex: Pick<Exercise, 'generator' | 'languageId'>, result: AnswerResult, lessonId?: string, now = Date.now(),
  ): Promise<number> {
    const xp = result.correct ? XP_CORRECT : XP_ATTEMPT
    await this.d.transaction('rw', [this.d.mastery, this.d.attempts, this.d.daily, this.d.profile], async () => {
      let fresh = 0
      for (const t of targets) {
        const id = masteryId(t.itemId, t.dimension)
        const cur = (await this.d.mastery.get(id)) ?? emptyRecord(t.itemId, ex.languageId, t.dimension, now)
        if (cur.correct + cur.incorrect === 0) fresh++
        await this.d.mastery.put(applyAnswer(cur, result, { now, generator: ex.generator, lessonId }))
        await this.d.attempts.add({
          at: now, languageId: ex.languageId, generator: ex.generator, itemId: t.itemId, dimension: t.dimension,
          correct: result.correct, ms: result.ms, hintUsed: result.hintUsed, chosen: result.chosen, lessonId,
        })
      }
      await this.bumpDaily(now, { xp, exercises: 1, correct: result.correct ? 1 : 0, studyMs: Math.min(result.ms, 120_000), newItems: fresh })
      await this.addXp(xp, now)
    })
    this.notify()
    return xp
  }

  async recordExposure(itemIds: string[], languageId: LanguageId, dimension: SkillTarget['dimension'], now = Date.now()): Promise<void> {
    await this.d.transaction('rw', this.d.mastery, async () => {
      for (const itemId of itemIds) {
        const cur = (await this.d.mastery.get(masteryId(itemId, dimension))) ?? emptyRecord(itemId, languageId, dimension, now)
        await this.d.mastery.put(applyExposure(cur, now))
      }
    })
    this.notify()
  }

  async addListening(ms: number, now = Date.now()): Promise<void> {
    await this.bumpDaily(now, { listeningMs: ms })
  }

  // ---------- lições e textos ----------

  async completeLesson(lessonId: string, languageId: LanguageId, accuracy: number, now = Date.now()): Promise<void> {
    const cur = await this.d.lessons.get(lessonId)
    await this.d.lessons.put({
      lessonId, languageId, completions: (cur?.completions ?? 0) + 1,
      bestAccuracy: Math.max(cur?.bestAccuracy ?? 0, accuracy), lastCompleted: now, updatedAt: now,
    })
    await this.bumpDaily(now, { xp: XP_LESSON })
    await this.addXp(XP_LESSON, now)
    await this.backup(now)
    this.notify()
  }

  async recordTextRead(textId: string, languageId: LanguageId, withoutTranslit: boolean, now = Date.now()): Promise<void> {
    const cur = await this.d.texts.get(textId)
    await this.d.texts.put({
      textId, languageId, reads: (cur?.reads ?? 0) + 1,
      readsWithoutTranslit: (cur?.readsWithoutTranslit ?? 0) + (withoutTranslit ? 1 : 0), lastRead: now, updatedAt: now,
    })
    this.notify()
  }

  // ---------- sessão em andamento ----------

  saveSession(s: SessionState): Promise<string> {
    return this.d.sessions.put({ ...s, updatedAt: Date.now() })
  }
  loadSession(id: string): Promise<SessionState | undefined> {
    return this.d.sessions.get(id)
  }
  async clearSession(id: string): Promise<void> {
    await this.d.sessions.delete(id)
    this.notify()
  }
  sessions(): Promise<SessionState[]> {
    return this.d.sessions.toArray()
  }

  // ---------- leitura ----------

  async snapshot(): Promise<ProgressSnapshot> {
    const [profile, mastery, lessons, texts, daily, achievements, sessions] = await Promise.all([
      this.profile(), this.d.mastery.toArray(), this.d.lessons.toArray(), this.d.texts.toArray(),
      this.d.daily.toArray(), this.d.achievements.toArray(), this.d.sessions.toArray(),
    ])
    return {
      profile, daily, achievements, sessions,
      mastery: new Map(mastery.map((m) => [m.id, m])),
      lessons: new Map(lessons.map((l) => [l.lessonId, l])),
      texts: new Map(texts.map((t) => [t.textId, t])),
    }
  }

  // ---------- conquistas ----------

  /** Confere as conquistas e devolve as recém-obtidas. */
  async checkAchievements(ctx: Pick<AchievementSnapshot, 'prayerTextIds' | 'kindOf'>, now = Date.now()): Promise<AchievementDef[]> {
    const s = await this.snapshot()
    const have = new Set(s.achievements.map((a) => a.id))
    const snap: AchievementSnapshot = {
      ...ctx, now, daily: s.daily, lessons: [...s.lessons.values()], texts: [...s.texts.values()], mastery: [...s.mastery.values()],
    }
    const earned = ACHIEVEMENTS.filter((a) => !have.has(a.id) && achievementEarned(a, snap))
    if (earned.length) {
      await this.d.achievements.bulkPut(earned.map((a): AchievementUnlock => ({ id: a.id, at: now })))
      this.notify()
    }
    return earned
  }

  // ---------- exportar / importar / backup / apagar ----------

  async exportAll(): Promise<ProgressExport> {
    const [profile, mastery, attempts, lessons, texts, daily, achievements, sessions] = await Promise.all([
      this.profile(), this.d.mastery.toArray(), this.d.attempts.toArray(), this.d.lessons.toArray(),
      this.d.texts.toArray(), this.d.daily.toArray(), this.d.achievements.toArray(), this.d.sessions.toArray(),
    ])
    return { app: 'logosquest', schema: SCHEMA_VERSION, exportedAt: Date.now(), profile, mastery, attempts, lessons, texts, daily, achievements, sessions }
  }

  /** Substitui todo o progresso pelo conteúdo de um arquivo exportado. */
  async importAll(data: unknown): Promise<void> {
    const d = validateExport(data)
    const tables = [this.d.profile, this.d.mastery, this.d.attempts, this.d.lessons, this.d.texts, this.d.daily, this.d.achievements, this.d.sessions]
    await this.d.transaction('rw', tables, async () => {
      await Promise.all(tables.map((t) => t.clear()))
      await this.d.profile.put({ ...d.profile, id: 'me', settings: { ...DEFAULT_SETTINGS, ...d.profile.settings } })
      await this.d.mastery.bulkPut(d.mastery)
      await this.d.attempts.bulkAdd(d.attempts.map(({ id: _id, ...a }) => a))
      await this.d.lessons.bulkPut(d.lessons)
      await this.d.texts.bulkPut(d.texts)
      await this.d.daily.bulkPut(d.daily)
      await this.d.achievements.bulkPut(d.achievements)
      await this.d.sessions.bulkPut(d.sessions)
    })
    this.notify()
  }

  /** Cópia de segurança interna, uma por dia, mantendo as mais recentes. */
  async backup(now = Date.now()): Promise<void> {
    const last = await this.d.backups.orderBy('at').last()
    if (last && dayKey(last.at) === dayKey(now)) await this.d.backups.delete(last.id!)
    await this.d.backups.add({ at: now, data: await this.exportAll() })
    const all = await this.d.backups.orderBy('at').primaryKeys()
    if (all.length > MAX_BACKUPS) await this.d.backups.bulkDelete(all.slice(0, all.length - MAX_BACKUPS))
  }

  async listBackups(): Promise<{ id: number; at: number }[]> {
    return (await this.d.backups.orderBy('at').reverse().toArray()).map((b) => ({ id: b.id!, at: b.at }))
  }

  async restoreBackup(id: number): Promise<void> {
    const b = await this.d.backups.get(id)
    if (!b) throw new Error('Cópia de segurança não encontrada.')
    await this.importAll(b.data)
  }

  /** Apaga o progresso. As cópias de segurança internas só saem com `includeBackups`. */
  async resetAll(includeBackups = false): Promise<void> {
    const tables = [this.d.profile, this.d.mastery, this.d.attempts, this.d.lessons, this.d.texts, this.d.daily, this.d.achievements, this.d.sessions]
    await Promise.all(tables.map((t) => t.clear()))
    if (includeBackups) await this.d.backups.clear()
    this.notify()
  }
}

export interface ProgressSnapshot {
  profile: Profile
  mastery: Map<string, MasteryRecord>
  lessons: Map<string, LessonProgress>
  texts: Map<string, TextProgress>
  daily: DailyStats[]
  achievements: AchievementUnlock[]
  sessions: SessionState[]
}

export function validateExport(data: unknown): ProgressExport {
  const d = data as Partial<ProgressExport> | null
  if (!d || typeof d !== 'object' || d.app !== 'logosquest') throw new Error('Este arquivo não é um backup do LogosQuest.')
  if (typeof d.schema !== 'number' || d.schema > SCHEMA_VERSION)
    throw new Error('Este backup foi criado por uma versão mais nova do aplicativo.')
  const lists = ['mastery', 'attempts', 'lessons', 'texts', 'daily', 'achievements', 'sessions'] as const
  for (const k of lists) if (!Array.isArray(d[k])) throw new Error(`Backup incompleto: falta "${k}".`)
  if (!d.profile || typeof d.profile.xp !== 'number') throw new Error('Backup incompleto: falta o perfil.')
  return d as ProgressExport
}

export const repo = new ProgressRepo()
