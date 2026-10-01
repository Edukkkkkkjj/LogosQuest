/**
 * Gera tests/fixtures/progress-advanced.json: um backup de progresso em que todas as
 * lições estão concluídas e todas as habilidades dominadas. Usado nos testes de
 * importação e na revisão visual das telas que só abrem com domínio (leitor, perfil).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LANGUAGES, loadBundle } from '../src/data/index'
import { applyAnswer, emptyRecord } from '../src/features/progress/mastery'
import { DEFAULT_SETTINGS } from '../src/features/progress/repo'
import { dayKey } from '../src/features/progress/stats'
import type { LessonProgress, MasteryRecord, ProgressExport } from '../src/types/progress'

const now = Date.UTC(2026, 0, 15, 12)
const mastery: MasteryRecord[] = []
const lessons: LessonProgress[] = []

for (const language of LANGUAGES) {
  const bundle = await loadBundle(language.id)
  for (const t of bundle.skills.flatMap((s) => s.targets)) {
    let rec = emptyRecord(t.itemId, language.id, t.dimension, now)
    // cinco acertos em dias seguidos, um erro no meio: histórico plausível
    for (let i = 0; i < 6; i++)
      rec = applyAnswer(rec, { correct: i !== 1, ms: 4000, hintUsed: false, chosen: i === 1 ? t.itemId : undefined }, { now: now + i * 86_400_000, generator: 'meaningChoose' })
    if (!mastery.some((m) => m.id === rec.id)) mastery.push(rec)
  }
  for (const l of bundle.lessons)
    lessons.push({ lessonId: l.id, languageId: language.id, completions: 1, bestAccuracy: 0.9, lastCompleted: now, updatedAt: now })
}

const data: ProgressExport = {
  app: 'logosquest', schema: 1, exportedAt: now,
  profile: { deviceId: 'fixture', createdAt: now, xp: 1840, settings: DEFAULT_SETTINGS, updatedAt: now },
  mastery, attempts: [], lessons, texts: [],
  daily: Array.from({ length: 6 }, (_, i) => ({ day: dayKey(now + i * 86_400_000), xp: 120, exercises: 14 + i * 3, correct: 12 + i * 2, listeningMs: 90_000, studyMs: 400_000, newItems: 5, updatedAt: now })),
  achievements: [{ id: 'first-lesson', at: now }], sessions: [],
}

const out = join(dirname(fileURLToPath(import.meta.url)), '../tests/fixtures/progress-advanced.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(data))
console.log(`✓ ${out}: ${mastery.length} registros de domínio, ${lessons.length} lições`)
