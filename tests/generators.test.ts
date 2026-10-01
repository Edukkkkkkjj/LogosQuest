import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '../src/data'
import { checkExercise } from '../src/data/validate'
import { GENERATORS, generate } from '../src/features/game/generators'
import { buildLessonScreens, buildPracticeScreens, dueTargets, easierRetry, weakestTargets } from '../src/features/game/session'
import { applyAnswer, emptyRecord, masteryId } from '../src/features/progress/mastery'
import type { GeneratorId, SkillTarget } from '../src/types/content'
import type { Exercise } from '../src/types/exercise'
import type { MasteryRecord } from '../src/types/progress'
import { ctx, index } from './helpers'

const exercisesOf = (screens: ReturnType<typeof buildLessonScreens>) => screens.flatMap((s) => (s.type === 'exercise' ? [s.exercise] : []))

describe.each(LANGUAGES.map((l) => l.id))('geradores de exercício: %s', (lang) => {
  it('os 22 tipos de jogo pedidos estão registrados (mais o reconhecimento básico de significado)', () => {
    expect(Object.keys(GENERATORS)).toHaveLength(23)
  })

  it('cada gerador produz exercícios válidos a partir dos dados', async () => {
    const idx = await index(lang)
    const letters = idx.bundle.glyphs.filter((g) => g.kind === 'letter').slice(0, 6).map((g) => g.id)
    const words = idx.bundle.skills.find((s) => s.id.includes('vocab'))!.targets.map((t) => t.itemId)
    const textId = idx.bundle.texts[0].id
    const frequent = lang === 'hebrew' ? 'he:lex:H0430' : 'gr:lex:ὁ'
    const cases: [GeneratorId, string[], string?][] = [
      ['nameChoose', letters], ['findLetter', letters], ['findSound', letters], ['listenChoose', letters], ['memory', letters],
      ['meaningChoose', words], ['listenChoose', words], ['listenAssemble', words], ['orderLetters', words], ['dictation', words],
      ['readAloud', words], ['listenIdentify', words], ['memory', words], ['cloze', words, textId], ['sentencePuzzle', [], textId],
      ['whoAmI', [], textId], ['morphBoss', [], textId], ['guidedTranslation', [], textId], ['rootDetective', []], ['rootHunt', []],
      ['contextDetective', []], ['errorHunt', []], ['textQuest', [], textId], ['bossFight', words, textId], ['bossFight', letters],
      ['correctForm', [frequent]],
    ]
    for (const [generator, itemIds, text] of cases) {
      const list = generate(ctx(idx), generator, { itemIds, textId: text, count: 3 })
      expect(list.length, generator).toBeGreaterThan(0)
      for (const ex of list) {
        expect(checkExercise(ex), `${generator}: ${JSON.stringify(ex).slice(0, 200)}`).toEqual([])
        for (const t of ex.targets) expect(idx.items.has(t.itemId), `${generator} → ${t.itemId}`).toBe(true)
      }
    }
  })

  it('a mesma semente refaz exatamente a mesma lição; outra semente, outra ordem', async () => {
    const idx = await index(lang)
    const lesson = idx.bundle.lessons[1]
    const o = { modelId: idx.bundle.language.defaultPronunciationId, audioAvailable: true }
    const strip = (list: Exercise[]) => JSON.stringify(list.map(({ id: _id, ...e }) => e))
    const a = exercisesOf(buildLessonScreens(lesson, idx, { ...o, seed: 42 }))
    const b = exercisesOf(buildLessonScreens(lesson, idx, { ...o, seed: 42 }))
    const c = exercisesOf(buildLessonScreens(lesson, idx, { ...o, seed: 43 }))
    expect(strip(a)).toBe(strip(b))
    expect(strip(a)).not.toBe(strip(c))
  })

  it('sem áudio disponível, nenhuma lição exige ouvir', async () => {
    const idx = await index(lang)
    for (const lesson of idx.bundle.lessons) {
      const list = exercisesOf(buildLessonScreens(lesson, idx, { seed: 1, modelId: idx.bundle.language.defaultPronunciationId, audioAvailable: false }))
      for (const ex of list) {
        expect((ex.kind === 'choice' || ex.kind === 'assemble') && ex.audioOnly, `${lesson.id} ${ex.generator}`).toBeFalsy()
        expect(ex.targets.some((t) => t.dimension === 'audio'), `${lesson.id} ${ex.generator}`).toBe(false)
      }
    }
  })

  it('exercícios de escuta nunca opõem dois sons iguais', async () => {
    const idx = await index(lang)
    const signs = idx.bundle.glyphs.filter((g) => g.kind !== 'letter').map((g) => g.id)
    for (let seed = 1; seed <= 20; seed++)
      for (const ex of generate(ctx(idx, seed), 'listenChoose', { itemIds: signs })) {
        if (ex.kind !== 'choice' || !ex.audioOnly) continue
        const sounds = ex.options.map((o) => idx.bundle.glyphs.find((g) => g.id === o.id)!).map((g) => (g.kind === 'vowel' ? g.translit : g.speak))
        expect(new Set(sounds).size, sounds.join(' | ')).toBe(sounds.length)
      }
  })

  it('toda lição ensina o que promete: os itens novos aparecem em cartão e em exercício', async () => {
    const idx = await index(lang)
    for (const lesson of idx.bundle.lessons.filter((l) => l.newItems.length)) {
      const screens = buildLessonScreens(lesson, idx, { seed: 5, modelId: idx.bundle.language.defaultPronunciationId, audioAvailable: true })
      const taught = new Set(screens.flatMap((s) => (s.type === 'teach' ? [s.itemId] : [])))
      const practised = new Set(exercisesOf(screens).flatMap((e) => e.targets.map((t) => t.itemId)))
      for (const id of lesson.newItems) {
        expect(taught.has(id), `${lesson.id}: ${id} sem cartão`).toBe(true)
        expect(practised.has(id), `${lesson.id}: ${id} sem exercício`).toBe(true)
      }
    }
  })

  it('a prática mira exatamente os itens pedidos', async () => {
    const idx = await index(lang)
    const targets: SkillTarget[] = idx.bundle.skills.flatMap((s) => s.targets).slice(0, 10)
    const screens = buildPracticeScreens(targets, idx, { seed: 3, modelId: idx.bundle.language.defaultPronunciationId, audioAvailable: true })
    expect(screens).toHaveLength(targets.length)
    const hit = new Set(exercisesOf(screens).flatMap((e) => e.targets.map((t) => t.itemId)))
    for (const t of targets) expect(hit.has(t.itemId)).toBe(true)
  })
})

describe('antifrustração', () => {
  it('a segunda chance de múltipla escolha fica só com a certa e a que foi marcada', async () => {
    const idx = await index('hebrew')
    const [ex] = generate(ctx(idx), 'nameChoose', { itemIds: idx.bundle.glyphs.slice(0, 6).map((g) => g.id), count: 1 })
    if (ex.kind !== 'choice') throw new Error('esperava múltipla escolha')
    const wrong = ex.options.find((o) => !o.correct)!
    const retry = easierRetry(ex, wrong.id)
    if (retry.kind !== 'choice') throw new Error('esperava múltipla escolha')
    expect(retry.retry).toBe(true)
    expect(retry.options).toHaveLength(2)
    expect(retry.options.map((o) => o.id).sort()).toEqual([wrong.id, ex.options.find((o) => o.correct)!.id].sort())
    expect(retry.targets).toEqual(ex.targets)
  })

  it('a segunda chance do ditado perde as letras sobrando', async () => {
    const idx = await index('greek')
    const [ex] = generate(ctx(idx), 'dictation', { itemIds: ['gr:lex:λόγος', 'gr:lex:θεός', 'gr:lex:ἀρχή'], count: 1 })
    if (ex.kind !== 'assemble') throw new Error('esperava montagem')
    expect(ex.tiles.length).toBeGreaterThan(ex.answer.length)
    const retry = easierRetry(ex)
    if (retry.kind !== 'assemble') throw new Error('esperava montagem')
    expect([...retry.tiles].sort()).toEqual([...ex.answer].sort())
  })
})

describe('filas de revisão e de prática', () => {
  const NOW = Date.UTC(2026, 0, 1)
  const rec = (itemId: string, results: boolean[], at = NOW): MasteryRecord => {
    let r = emptyRecord(itemId, 'hebrew', 'form', at)
    for (const correct of results) r = applyAnswer(r, { correct, ms: 3000, hintUsed: false }, { now: at, generator: 'nameChoose' })
    return r
  }
  const map = (...list: MasteryRecord[]) => new Map(list.map((r) => [r.id, r]))

  it('a revisão traz só o que venceu, o mais atrasado primeiro', () => {
    const old = rec('a', [true], NOW - 30 * 86_400_000)
    const recent = rec('b', [true], NOW - 5 * 86_400_000)
    const fresh = rec('c', [true, true, true], NOW)
    expect(dueTargets(map(fresh, recent, old), 'hebrew', NOW, 10).map((t) => t.itemId)).toEqual(['a', 'b'])
    expect(dueTargets(map(old), 'greek', NOW, 10)).toEqual([])
  })

  it('a prática da unidade começa pelos pontos mais fracos, inclusive os nunca vistos', () => {
    const targets: SkillTarget[] = ['a', 'b', 'c'].map((itemId) => ({ itemId, dimension: 'form' }))
    const m = map(rec('a', [true, true, true]), rec('b', [true, false]))
    expect(masteryId('a', 'form')).toBe('a|form')
    expect(weakestTargets(targets, m, 2).map((t) => t.itemId)).toEqual(['c', 'b'])
  })
})
