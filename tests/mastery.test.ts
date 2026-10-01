import { describe, expect, it } from 'vitest'
import { applyAnswer, applyExposure, diagnose, emptyRecord, gradeFor, masteryId, stateOf } from '../src/features/progress/mastery'
import { Rating, isDue, newCard, schedule } from '../src/features/review/srs'
import type { MasteryRecord } from '../src/types/progress'

const NOW = Date.UTC(2026, 0, 1)
const DAY = 86_400_000
const ok = { correct: true, ms: 4000, hintUsed: false }
const miss = { correct: false, ms: 4000, hintUsed: false, chosen: 'he:letter:resh' }
const ctx = (now = NOW) => ({ now, generator: 'nameChoose' as const })

describe('cálculo de domínio', () => {
  it('um item novo começa como "não visto" e vira "aprendendo" ao ser exposto', () => {
    const rec = emptyRecord('he:letter:dalet', 'hebrew', 'form', NOW)
    expect(stateOf(undefined, NOW)).toBe('unseen')
    expect(stateOf(rec, NOW)).toBe('unseen')
    expect(stateOf(applyExposure(rec, NOW), NOW)).toBe('learning')
  })

  it('a confiança sobe com acertos e passa de 0,8 no quarto acerto seguido', () => {
    let rec = emptyRecord('x', 'hebrew', 'form', NOW)
    const seen: number[] = []
    for (let i = 0; i < 4; i++) seen.push((rec = applyAnswer(rec, ok, ctx())).confidence)
    expect(seen[0]).toBeCloseTo(0.4)
    expect(seen[2]).toBeLessThan(0.8)
    expect(seen[3]).toBeGreaterThan(0.8)
    expect(rec).toMatchObject({ exposures: 4, correct: 4, incorrect: 0, streak: 4, totalMs: 16000 })
  })

  it('o erro reduz a confiança sem zerá-la e guarda o contexto do erro', () => {
    let rec = emptyRecord('he:letter:dalet', 'hebrew', 'form', NOW)
    rec = applyAnswer(applyAnswer(rec, ok, ctx()), ok, ctx())
    const after = applyAnswer(rec, miss, { now: NOW, generator: 'findLetter', lessonId: 'he-l1-1' })
    expect(after.confidence).toBeGreaterThan(0)
    expect(after.confidence).toBeLessThan(rec.confidence)
    expect(after.streak).toBe(0)
    expect(after.recentErrors.at(-1)).toMatchObject({ generator: 'findLetter', chosen: 'he:letter:resh', lessonId: 'he-l1-1' })
  })

  it('acerto com pista vale menos do que acerto sem pista', () => {
    const rec = emptyRecord('x', 'greek', 'meaning', NOW)
    expect(applyAnswer(rec, { ...ok, hintUsed: true }, ctx()).confidence).toBeLessThan(applyAnswer(rec, ok, ctx()).confidence)
  })

  it('converte a resposta em nota FSRS levando em conta tempo, pista e autoavaliação', () => {
    expect(gradeFor(miss)).toBe(Rating.Again)
    expect(gradeFor({ ...ok, ms: 1500 })).toBe(Rating.Easy)
    expect(gradeFor(ok)).toBe(Rating.Good)
    expect(gradeFor({ ...ok, ms: 20_000 })).toBe(Rating.Hard)
    expect(gradeFor({ ...ok, hintUsed: true })).toBe(Rating.Hard)
    expect(gradeFor({ ...ok, perceived: 2 })).toBe(Rating.Hard)
  })

  it('registra a dificuldade percebida informada pelo usuário', () => {
    const rec = applyAnswer(emptyRecord('x', 'greek', 'reading', NOW), { ...ok, perceived: 2 }, ctx())
    expect(rec.perceivedDifficulty).toBe(3)
  })

  it('só chama de "dominado" o que tem confiança alta E memória estável', () => {
    let rec = emptyRecord('x', 'hebrew', 'meaning', NOW)
    let now = NOW
    for (let i = 0; i < 4; i++) rec = applyAnswer(rec, ok, ctx(now))
    expect(stateOf(rec, now)).toBe('familiar')
    for (let i = 0; i < 6; i++) {
      now = rec.card.due + 1000
      expect(stateOf(rec, now)).toBe('review')
      rec = applyAnswer(rec, ok, ctx(now))
    }
    expect(rec.card.stability).toBeGreaterThan(21)
    expect(stateOf(rec, now)).toBe('mastered')
  })
})

describe('diagnóstico de dificuldades', () => {
  const build = (dim: MasteryRecord['dimension'], results: boolean[]) => {
    let rec = emptyRecord('gr:lex:λόγος', 'greek', dim, NOW)
    for (const r of results) rec = applyAnswer(rec, r ? ok : { ...miss, chosen: 'gr:lex:λέγω' }, ctx())
    return [masteryId('gr:lex:λόγος', dim), rec] as const
  }
  const label = (id: string) => id.split(':').pop()!

  it('distingue "conhece a palavra" de "confunde a forma"', () => {
    const m = new Map([build('meaning', [true, true, true, true]), build('morphology', [false, false])])
    expect(diagnose(m, 'gr:lex:λόγος', label)?.message).toContain('formas flexionadas')
  })

  it('aponta a confusão recorrente entre dois itens', () => {
    const m = new Map([build('meaning', [false, false, true])])
    expect(diagnose(m, 'gr:lex:λόγος', label)?.message).toBe('Você costuma confundir λόγος com λέγω.')
  })

  it('não inventa diagnóstico quando não houve erro', () => {
    expect(diagnose(new Map([build('meaning', [true, true])]), 'gr:lex:λόγος', label)).toBeNull()
  })
})

describe('repetição espaçada (FSRS)', () => {
  it('os intervalos crescem a cada acerto', () => {
    let card = newCard(NOW)
    let now = NOW
    const intervals: number[] = []
    for (let i = 0; i < 6; i++) {
      card = schedule(card, Rating.Good, now)
      intervals.push(card.due - now)
      now = card.due
    }
    expect(intervals.at(-1)!).toBeGreaterThan(10 * DAY)
    for (let i = 3; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1])
  })

  it('um esquecimento encurta o intervalo e conta como lapso', () => {
    let card = newCard(NOW)
    let now = NOW
    for (let i = 0; i < 5; i++) {
      card = schedule(card, Rating.Good, now)
      now = card.due
    }
    const before = card.scheduledDays
    const lapsed = schedule(card, Rating.Again, now)
    expect(lapsed.lapses).toBe(card.lapses + 1)
    expect(lapsed.due - now).toBeLessThan(before * DAY)
    expect(lapsed.stability).toBeLessThan(card.stability)
  })

  it('"fácil" agenda para mais longe do que "difícil"', () => {
    const base = schedule(schedule(newCard(NOW), Rating.Good, NOW), Rating.Good, NOW + DAY)
    expect(schedule(base, Rating.Easy, NOW + 3 * DAY).due).toBeGreaterThan(schedule(base, Rating.Hard, NOW + 3 * DAY).due)
  })

  it('um cartão nunca respondido não entra na fila de revisão', () => {
    const card = newCard(NOW)
    expect(isDue(card, NOW + 365 * DAY)).toBe(false)
    const seen = schedule(card, Rating.Good, NOW)
    expect(isDue(seen, NOW)).toBe(false)
    expect(isDue(seen, seen.due)).toBe(true)
  })

  it('é determinístico (sem sorteio no agendamento)', () => {
    expect(schedule(newCard(NOW), Rating.Good, NOW)).toEqual(schedule(newCard(NOW), Rating.Good, NOW))
  })
})
