/**
 * Repetição espaçada com FSRS (Free Spaced Repetition Scheduler), via ts-fsrs.
 *
 * O FSRS modela a memória de cada cartão com dois números — estabilidade
 * (quantos dias até a chance de lembrar cair a 90%) e dificuldade — e agenda
 * a próxima revisão para quando a lembrança estaria prestes a falhar.
 * Aqui só adaptamos o formato: datas viram epoch ms para caber no IndexedDB.
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs'
import type { ReviewCard } from '../../types/progress'

// fuzz desligado: o agendamento fica determinístico (e testável)
const scheduler = fsrs(generatorParameters({ enable_fuzz: false, request_retention: 0.9 }))

export { Rating }
export type { Grade }

function toCard(c: ReviewCard): Card {
  return {
    due: new Date(c.due), stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays, learning_steps: c.learningSteps, reps: c.reps, lapses: c.lapses,
    state: c.state, last_review: c.lastReview ? new Date(c.lastReview) : undefined,
  }
}

function fromCard(c: Card): ReviewCard {
  return {
    due: c.due.getTime(), stability: c.stability, difficulty: c.difficulty, elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days, learningSteps: c.learning_steps, reps: c.reps, lapses: c.lapses,
    state: c.state, lastReview: c.last_review?.getTime(),
  }
}

export function newCard(now: number): ReviewCard {
  return fromCard(createEmptyCard(new Date(now)))
}

export function schedule(card: ReviewCard, grade: Grade, now: number): ReviewCard {
  return fromCard(scheduler.next(toCard(card), new Date(now), grade).card)
}

export function isDue(card: ReviewCard, now: number): boolean {
  return card.reps > 0 && card.due <= now
}
