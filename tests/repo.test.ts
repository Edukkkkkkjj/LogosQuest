import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { loadBundle } from '../src/data'
import { generate } from '../src/features/game/generators'
import { masteryId } from '../src/features/progress/mastery'
import { ProgressRepo, validateExport, XP_CORRECT, XP_LESSON } from '../src/features/progress/repo'
import { achievementEarned, dayKey, playerLevel, streak, summarize, textCoverage } from '../src/features/progress/stats'
import { courseStatus, nextLesson, textUnlocked, unitNeedingPractice } from '../src/features/progress/unlock'
import { ACHIEVEMENTS } from '../src/data'
import { AppDb } from '../src/lib/db'
import type { DailyStats, ProgressExport } from '../src/types/progress'
import { ctx, index } from './helpers'

const NOW = Date.UTC(2026, 0, 10, 12)
const DAY = 86_400_000
let n = 0
let db: AppDb
let repo: ProgressRepo

beforeEach(() => {
  db = new AppDb(`teste-${++n}`)
  repo = new ProgressRepo(db)
})

const ok = { correct: true, ms: 3000, hintUsed: false }
const fixture = (): ProgressExport => JSON.parse(readFileSync('tests/fixtures/progress-advanced.json', 'utf8'))

describe('persistência', () => {
  it('grava cada resposta na hora: domínio, tentativa, XP e estatística do dia', async () => {
    const idx = await index('hebrew')
    const [ex] = generate(ctx(idx), 'nameChoose', { itemIds: ['he:letter:alef', 'he:letter:bet'], count: 1 })
    const xp = await repo.recordAnswer(ex, ok, 'he-l1-1', NOW)
    expect(xp).toBe(XP_CORRECT)

    // um repositório novo sobre o mesmo banco = "fechar e reabrir o navegador"
    const reopened = await new ProgressRepo(new AppDb(db.name)).snapshot()
    const rec = reopened.mastery.get(masteryId(ex.targets[0].itemId, 'form'))!
    expect(rec).toMatchObject({ correct: 1, exposures: 1, languageId: 'hebrew' })
    expect(reopened.profile.xp).toBe(XP_CORRECT)
    expect(reopened.daily).toMatchObject([{ day: dayKey(NOW), exercises: 1, correct: 1, newItems: 1 }])
    expect(await db.attempts.count()).toBe(1)
  })

  it('guarda e devolve a lição em andamento, para retomar na mesma tela', async () => {
    const s = { id: 'hebrew:he-l1-1', languageId: 'hebrew' as const, lessonId: 'he-l1-1', seed: 99, stepIndex: 7, results: { correct: 5, total: 6 }, startedAt: NOW, updatedAt: NOW }
    await repo.saveSession(s)
    expect(await new ProgressRepo(new AppDb(db.name)).loadSession(s.id)).toMatchObject({ seed: 99, stepIndex: 7, results: { correct: 5, total: 6 } })
    await repo.clearSession(s.id)
    expect(await repo.loadSession(s.id)).toBeUndefined()
  })

  it('concluir uma lição soma XP, conta a conclusão e cria cópia de segurança', async () => {
    await repo.completeLesson('he-l0-1', 'hebrew', 0.8, NOW)
    await repo.completeLesson('he-l0-1', 'hebrew', 0.6, NOW + 1000)
    const s = await repo.snapshot()
    expect(s.lessons.get('he-l0-1')).toMatchObject({ completions: 2, bestAccuracy: 0.8 })
    expect(s.profile.xp).toBe(2 * XP_LESSON)
    expect(await repo.listBackups()).toHaveLength(1)
  })

  it('avisa os ouvintes a cada gravação', async () => {
    let calls = 0
    const off = repo.subscribe(() => calls++)
    await repo.updateSettings({ showTranslit: false })
    await repo.recordTextRead('he-ps-23', 'hebrew', true, NOW)
    off()
    await repo.updateSettings({ showTranslit: true })
    expect(calls).toBe(2)
    expect((await repo.snapshot()).texts.get('he-ps-23')).toMatchObject({ reads: 1, readsWithoutTranslit: 1 })
  })
})

describe('exportar, importar, restaurar e apagar', () => {
  it('exportar → apagar → importar devolve exatamente o mesmo progresso', async () => {
    const idx = await index('greek')
    for (const ex of generate(ctx(idx), 'meaningChoose', { itemIds: ['gr:lex:λόγος', 'gr:lex:θεός', 'gr:lex:φῶς'] })) await repo.recordAnswer(ex, ok, 'gr-l0-1', NOW)
    await repo.completeLesson('gr-l0-1', 'greek', 1, NOW)
    await repo.updateSettings({ textScale: 1.3, pronunciation: { hebrew: 'he-academic', greek: 'gr-erasmian' } })
    const exported = JSON.parse(JSON.stringify(await repo.exportAll()))
    const before = await repo.snapshot()

    await repo.resetAll()
    expect((await repo.snapshot()).mastery.size).toBe(0)
    expect((await repo.snapshot()).profile.xp).toBe(0)

    await repo.importAll(exported)
    const after = await repo.snapshot()
    expect(after.mastery).toEqual(before.mastery)
    expect(after.lessons).toEqual(before.lessons)
    expect(after.profile.xp).toBe(before.profile.xp)
    expect(after.profile.settings).toMatchObject({ textScale: 1.3, pronunciation: { greek: 'gr-erasmian' } })
    expect(await db.attempts.count()).toBe(3)
  })

  it('recusa arquivos que não são backup do app, sem tocar no progresso atual', async () => {
    await repo.completeLesson('he-l0-1', 'hebrew', 1, NOW)
    await expect(repo.importAll({ foo: 1 })).rejects.toThrow(/não é um backup/)
    await expect(repo.importAll({ ...fixture(), schema: 99 })).rejects.toThrow(/versão mais nova/)
    await expect(repo.importAll({ ...fixture(), mastery: undefined })).rejects.toThrow(/incompleto/)
    expect((await repo.snapshot()).lessons.size).toBe(1)
    expect(() => validateExport(null)).toThrow()
  })

  it('apagar mantém as cópias de segurança, e uma cópia pode ser restaurada', async () => {
    await repo.completeLesson('he-l0-1', 'hebrew', 1, NOW)
    await repo.resetAll()
    const [backup] = await repo.listBackups()
    expect(backup).toBeDefined()
    await repo.restoreBackup(backup.id)
    expect((await repo.snapshot()).lessons.get('he-l0-1')?.completions).toBe(1)
  })

  it('mantém uma cópia por dia e no máximo cinco', async () => {
    for (let d = 0; d < 8; d++) {
      await repo.backup(NOW + d * DAY)
      await repo.backup(NOW + d * DAY + 1000)
    }
    const list = await repo.listBackups()
    expect(list).toHaveLength(5)
    expect(dayKey(list[0].at)).toBe(dayKey(NOW + 7 * DAY))
  })
})

describe('progressão e desbloqueio', () => {
  it('no começo só a primeira lição da primeira unidade está aberta', async () => {
    const bundle = await loadBundle('hebrew')
    const units = courseStatus(bundle, new Map(), new Map())
    expect(units[0].unlocked).toBe(true)
    expect(units[0].lessons[0].unlocked).toBe(true)
    expect(units.slice(1).every((u) => !u.unlocked)).toBe(true)
    expect(nextLesson(units)?.lesson.id).toBe('he-l0-1')
    expect(bundle.texts.every((t) => !textUnlocked(t, units))).toBe(true)
  })

  it('terminar as lições NÃO abre a próxima unidade: é preciso domínio', async () => {
    const bundle = await loadBundle('greek')
    await repo.completeLesson('gr-l0-1', 'greek', 0.4, NOW)
    let s = await repo.snapshot()
    let units = courseStatus(bundle, s.mastery, s.lessons)
    expect(units[0].lessonsDone).toBe(true)
    expect(units[0].passed).toBe(false)
    expect(units[1].unlocked).toBe(false)
    expect(unitNeedingPractice(units)?.unit.id).toBe('gr-u0')
    expect(nextLesson(units)).toBeNull()

    // três acertos por palavra → domínio acima do limiar de 60% → abre a unidade 1
    const idx = await index('greek')
    for (let round = 0; round < 3; round++)
      for (const ex of generate(ctx(idx, round), 'meaningChoose', { itemIds: bundle.lessons[0].newItems })) await repo.recordAnswer(ex, ok, 'gr-l0-1', NOW)
    s = await repo.snapshot()
    units = courseStatus(bundle, s.mastery, s.lessons)
    expect(units[0].mastery).toBeGreaterThan(0.6)
    expect(units[1].unlocked).toBe(true)
    expect(nextLesson(units)?.lesson.id).toBe('gr-l1-1')
  })

  it('dentro da unidade, as lições abrem em sequência; as concluídas ficam livres para revisão', async () => {
    const bundle = await loadBundle('hebrew')
    await repo.importAll(fixture())
    const s = await repo.snapshot()
    s.lessons.delete('he-l1-2')
    const u1 = courseStatus(bundle, s.mastery, s.lessons).find((u) => u.unit.id === 'he-u1')!
    expect(u1.lessons.map((l) => [l.lesson.id, l.unlocked, l.completed])).toEqual([
      ['he-l1-1', true, true], ['he-l1-2', true, false], ['he-l1-3', true, true], ['he-l1-boss-1', true, true],
    ])
    s.lessons.delete('he-l1-3')
    const again = courseStatus(bundle, s.mastery, s.lessons).find((u) => u.unit.id === 'he-u1')!
    expect(again.lessons.find((l) => l.lesson.id === 'he-l1-3')?.unlocked).toBe(false)
  })

  it('com o progresso avançado importado, tudo está aberto e os textos têm cobertura alta', async () => {
    await repo.importAll(fixture())
    const s = await repo.snapshot()
    for (const lang of ['hebrew', 'greek'] as const) {
      const bundle = await loadBundle(lang)
      const units = courseStatus(bundle, s.mastery, s.lessons)
      expect(units.every((u) => u.unlocked && u.passed), lang).toBe(true)
      expect(bundle.texts.every((t) => textUnlocked(t, units)), lang).toBe(true)
      expect(textCoverage(bundle.texts[0], s.mastery).ratio, lang).toBeGreaterThan(0.75)
      expect(textCoverage(bundle.texts[0], new Map()).ratio).toBe(0)
      const sum = summarize(bundle, s.mastery, NOW)
      expect(sum.lettersFamiliar).toBe(sum.lettersTotal)
      expect(sum.overall).toBeGreaterThan(0.8)
    }
  })
})

describe('estatísticas e conquistas', () => {
  const day = (offset: number, exercises = 5): DailyStats => ({ day: dayKey(NOW + offset * DAY), xp: 0, exercises, correct: 0, listeningMs: 0, studyMs: 0, newItems: 0, updatedAt: NOW })

  it('conta a sequência de dias, tolerando que hoje ainda não tenha estudo', () => {
    expect(streak([], NOW)).toBe(0)
    expect(streak([day(0), day(-1), day(-2)], NOW)).toBe(3)
    expect(streak([day(-1), day(-2)], NOW)).toBe(2)
    expect(streak([day(0), day(-2)], NOW)).toBe(1)
    expect(streak([day(-2), day(-3)], NOW)).toBe(0)
  })

  it('o nível do jogador cresce com o XP', () => {
    expect(playerLevel(0)).toMatchObject({ level: 1, into: 0 })
    expect(playerLevel(99).level).toBe(1)
    expect(playerLevel(100).level).toBe(2)
    expect(playerLevel(5000).level).toBeGreaterThan(playerLevel(1000).level)
  })

  it('concede conquistas pelas regras declaradas no conteúdo, uma única vez', async () => {
    await repo.completeLesson('he-l0-1', 'hebrew', 1, NOW)
    const kindOf = (id: string) => (id.includes(':letter:') ? 'letter' as const : 'lexeme' as const)
    const first = await repo.checkAchievements({ prayerTextIds: new Set(['he-ps-23']), kindOf }, NOW)
    expect(first.map((a) => a.id)).toEqual(['first-lesson'])
    expect(await repo.checkAchievements({ prayerTextIds: new Set(), kindOf }, NOW)).toEqual([])

    await repo.completeLesson('gr-l0-1', 'greek', 1, NOW)
    await repo.recordTextRead('he-ps-23', 'hebrew', true, NOW)
    const more = (await repo.checkAchievements({ prayerTextIds: new Set(['he-ps-23']), kindOf }, NOW)).map((a) => a.id)
    expect(more.sort()).toEqual(['both', 'first-prayer', 'first-text', 'no-translit'])
  })

  it('a conquista do alfabeto exige as 22 letras familiares', async () => {
    const def = ACHIEVEMENTS.find((a) => a.id === 'he-letters')!
    const data = fixture()
    const snap = { lessons: [], texts: [], daily: [], prayerTextIds: new Set<string>(), now: NOW, kindOf: (id: string) => (id.includes(':letter:') ? 'letter' as const : 'other' as const) }
    expect(achievementEarned(def, { ...snap, mastery: data.mastery })).toBe(true)
    expect(achievementEarned(def, { ...snap, mastery: data.mastery.filter((m) => m.itemId !== 'he:letter:alef') })).toBe(true)
    expect(achievementEarned(def, { ...snap, mastery: data.mastery.slice(0, 10) })).toBe(false)
  })
})
