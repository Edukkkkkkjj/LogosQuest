/**
 * Progressão e desbloqueio. O conteúdo seguinte abre por DOMÍNIO, não por
 * conclusão: a unidade anterior precisa atingir seu limiar. Tudo o que já foi
 * aberto fica disponível para revisão livre.
 */
import type { ContentBundle, Lesson, Level, Skill, Text, Unit } from '../../types/content'
import type { LessonProgress, MasteryRecord } from '../../types/progress'
import { masteryId } from './mastery'

export function skillMastery(skill: Skill, mastery: Map<string, MasteryRecord>): number {
  if (skill.targets.length === 0) return 0
  let sum = 0
  for (const t of skill.targets) sum += mastery.get(masteryId(t.itemId, t.dimension))?.confidence ?? 0
  return sum / skill.targets.length
}

export function unitMastery(unit: Unit, bundle: ContentBundle, mastery: Map<string, MasteryRecord>): number {
  const targets = bundle.skills.filter((s) => unit.skillIds.includes(s.id)).flatMap((s) => s.targets)
  if (targets.length === 0) return 0
  let sum = 0
  for (const t of targets) sum += mastery.get(masteryId(t.itemId, t.dimension))?.confidence ?? 0
  return sum / targets.length
}

export interface LessonStatus {
  lesson: Lesson
  unlocked: boolean
  completed: boolean
}

export interface UnitStatus {
  unit: Unit
  level: Level
  mastery: number
  /** domínio ≥ limiar da própria unidade */
  passed: boolean
  unlocked: boolean
  lessons: LessonStatus[]
  /** todas as lições concluídas ao menos uma vez */
  lessonsDone: boolean
}

export function courseStatus(
  bundle: ContentBundle,
  mastery: Map<string, MasteryRecord>,
  lessons: Map<string, LessonProgress>,
): UnitStatus[] {
  const out: UnitStatus[] = []
  let previousPassed = true
  for (const level of bundle.course.levels) {
    if (level.status !== 'available') continue
    for (const unit of level.units) {
      const m = unitMastery(unit, bundle, mastery)
      const unlocked: boolean = previousPassed
      let previousDone = true
      const ls: LessonStatus[] = unit.lessonIds.map((id) => {
        const lesson = bundle.lessons.find((l) => l.id === id)!
        const completed = (lessons.get(id)?.completions ?? 0) > 0
        // dentro da unidade, cada lição abre quando a anterior foi concluída
        const status: LessonStatus = { lesson, completed, unlocked: unlocked && (previousDone || completed) }
        previousDone = completed
        return status
      })
      const passed = m >= unit.masteryThreshold
      out.push({ unit, level, mastery: m, passed, unlocked, lessons: ls, lessonsDone: ls.every((l) => l.completed) })
      previousPassed = unlocked && passed
    }
  }
  return out
}

export function textUnlocked(text: Text, units: UnitStatus[]): boolean {
  if (!text.unlockAfterUnitId) return true
  return units.find((u) => u.unit.id === text.unlockAfterUnitId)?.passed ?? false
}

/** Próxima lição recomendada: a primeira aberta e ainda não concluída. */
export function nextLesson(units: UnitStatus[]): LessonStatus | null {
  for (const u of units) for (const l of u.lessons) if (l.unlocked && !l.completed) return l
  return null
}

/** Unidade aberta, com lições feitas, mas ainda abaixo do limiar: pede prática. */
export function unitNeedingPractice(units: UnitStatus[]): UnitStatus | null {
  return units.find((u) => u.unlocked && u.lessonsDone && !u.passed) ?? null
}
