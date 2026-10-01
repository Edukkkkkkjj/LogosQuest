/**
 * Banco local (IndexedDB via Dexie). Local-first: nada sai do aparelho.
 *
 * Preparado para sincronização futura: todo registro tem chave estável e
 * `updatedAt`; o perfil tem `deviceId`. Um serviço de sync poderá enviar os
 * registros alterados desde a última sincronização e resolver conflitos por
 * "última escrita vence" sem mudar este esquema.
 */
import Dexie, { type EntityTable, type Table } from 'dexie'
import type {
  AchievementUnlock, DailyStats, ExerciseAttempt, LessonProgress, MasteryRecord, Profile,
  ProgressExport, SessionState, TextProgress,
} from '../types/progress'

export interface ProfileRow extends Profile {
  id: 'me'
}

export interface BackupRow {
  id?: number
  at: number
  data: ProgressExport
}

export class AppDb extends Dexie {
  profile!: EntityTable<ProfileRow, 'id'>
  mastery!: EntityTable<MasteryRecord, 'id'>
  attempts!: Table<ExerciseAttempt, number>
  lessons!: EntityTable<LessonProgress, 'lessonId'>
  texts!: EntityTable<TextProgress, 'textId'>
  daily!: EntityTable<DailyStats, 'day'>
  achievements!: EntityTable<AchievementUnlock, 'id'>
  sessions!: EntityTable<SessionState, 'id'>
  backups!: Table<BackupRow, number>

  constructor(name = 'logosquest') {
    super(name)
    this.version(1).stores({
      profile: 'id',
      mastery: 'id, languageId, itemId, updatedAt',
      attempts: '++id, at, languageId, itemId',
      lessons: 'lessonId, languageId, updatedAt',
      texts: 'textId, languageId, updatedAt',
      daily: 'day',
      achievements: 'id',
      sessions: 'id, languageId',
      backups: '++id, at',
    })
  }
}

export const db = new AppDb()
