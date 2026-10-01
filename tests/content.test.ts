import { describe, expect, it } from 'vitest'
import manifest from '../content/audio/manifest.json'
import type { BuildIssue } from '../src/data/build'
import { LANGUAGES, SOURCES, loadBundle } from '../src/data'
import { checkExercise, validateBundle } from '../src/data/validate'
import { morphLayers, summarizeMorph } from '../src/lib/morph/describe'
import { parseMorphGnt, parseOshb } from '../src/lib/morph/parse'
import { transliterateGreek, transliterateHebrew } from '../src/lib/translit'
import { findUnicodeIssues, splitGraphemes, stripCantillation, stripGreekDiacritics, stripNiqqud } from '../src/lib/unicode'
import type { AudioManifest } from '../src/types/content'
import { index } from './helpers'

describe.each(LANGUAGES.map((l) => l.id))('conteúdo: %s', (lang) => {
  it('monta o pacote sem pendências e passa na validação', async () => {
    const issues: BuildIssue[] = []
    const bundle = await loadBundle(lang, issues)
    expect(issues).toEqual([])
    expect(validateBundle(bundle, SOURCES, manifest as AudioManifest).filter((p) => p.level === 'error')).toEqual([])
  })

  it('toda ocorrência textual liga forma → lema → morfologia → glosa', async () => {
    const idx = await index(lang)
    expect(idx.occurrences.length).toBeGreaterThan(100)
    for (const o of idx.occurrences) {
      const stem = o.word.segments.find((s) => s.role === 'stem')
      expect(stem?.lexemeId && idx.items.has(stem.lexemeId), o.word.surface).toBe(true)
      expect(o.word.gloss, o.word.surface).toBeTruthy()
      expect(morphLayers(stem!.morph).length, o.word.surface).toBeGreaterThan(0)
    }
  })

  it('o validador acusa um pacote corrompido', async () => {
    const bundle = structuredClone(await loadBundle(lang))
    bundle.lexemes[0].glosses = []
    bundle.lessons[0].newItems.push('xx:lex:inexistente')
    bundle.texts[0].ref = ''
    const messages = validateBundle(bundle, SOURCES, manifest as AudioManifest).map((p) => p.message)
    expect(messages).toContain('lexema sem glosa')
    expect(messages).toContain('texto sem referência')
    expect(messages.some((m) => m.includes('item inexistente'))).toBe(true)
  })

  it('o curso tem níveis disponíveis e níveis planejados, sem telas vazias', async () => {
    const { course } = await loadBundle(lang)
    const available = course.levels.filter((l) => l.status === 'available')
    expect(available.length).toBeGreaterThanOrEqual(5)
    for (const l of available) expect(l.units.every((u) => u.lessonIds.length > 0)).toBe(true)
    for (const l of course.levels.filter((x) => x.status === 'planned')) expect(l.units).toEqual([])
  })
})

describe('validador de exercícios', () => {
  it('recusa múltipla escolha com opções repetidas ou sem resposta certa', () => {
    const base = { kind: 'choice' as const, id: 'x', generator: 'meaningChoose' as const, languageId: 'greek' as const, targets: [], instruction: '?' }
    const opt = (text: string, correct: boolean) => ({ id: text, label: { text }, correct })
    expect(checkExercise({ ...base, options: [opt('a', true), opt('b', false)] })).toEqual([])
    expect(checkExercise({ ...base, options: [opt('a', false), opt('b', false)] })[0]).toMatch(/exatamente uma/)
    expect(checkExercise({ ...base, options: [opt('a', true), opt('a', false)] })[0]).toMatch(/repetidas/)
  })
})

describe('morfologia: OSHB', () => {
  it('analisa um verbo com prefixo: וַיֹּאמֶר (HC/Vqw3ms)', () => {
    const [conj, verb] = parseOshb('HC/Vqw3ms')
    expect(conj.pos).toBe('conjunction')
    expect(verb).toMatchObject({ pos: 'verb', stem: 'qal', tense: 'wayyiqtol', person: '3', gender: 'm', number: 's' })
    expect(summarizeMorph(verb)).toBe('verbo · Qal · imperfeito consecutivo (wayyiqtol) · 3ª pessoa · masculino · singular')
  })

  it('analisa substantivo em construto com sufixo pronominal: אֱלֹהֵינוּ (HNcmpc/Sp1cp)', () => {
    const [noun, suffix] = parseOshb('HNcmpc/Sp1cp')
    expect(noun).toMatchObject({ pos: 'noun', subtype: 'common', gender: 'm', number: 'p', state: 'construct' })
    expect(suffix).toMatchObject({ pos: 'suffix', subtype: 'pronominal', person: '1', gender: 'c', number: 'p' })
  })

  it('distingue artigo de outras partículas e trata o particípio como nominal', () => {
    expect(parseOshb('HTd')[0].pos).toBe('article')
    expect(parseOshb('HTo')[0]).toMatchObject({ pos: 'particle', subtype: 'object-marker' })
    expect(parseOshb('HVprfsa')[0]).toMatchObject({ stem: 'piel', tense: 'participle', gender: 'f', number: 's', state: 'absolute' })
  })
})

describe('morfologia: MorphGNT', () => {
  it('analisa um verbo: ἦν (V- 3IAI-S--)', () => {
    expect(parseMorphGnt('V-', '3IAI-S--')).toMatchObject({ pos: 'verb', person: '3', tense: 'imperfect', voice: 'active', mood: 'indicative', number: 's' })
  })
  it('analisa um nome: ἀρχῇ (N- ----DSF-)', () => {
    const m = parseMorphGnt('N-', '----DSF-')
    expect(m).toMatchObject({ pos: 'noun', case: 'dative', number: 's', gender: 'f' })
    expect(summarizeMorph(m)).toBe('substantivo · dativo · feminino · singular')
  })
  it('analisa artigo e particípio', () => {
    expect(parseMorphGnt('RA', '----ASM-')).toMatchObject({ pos: 'article', case: 'accusative', gender: 'm' })
    expect(parseMorphGnt('V-', '-PAPNPM-')).toMatchObject({ tense: 'present', mood: 'participle', case: 'nominative', number: 'p' })
  })
})

describe('Unicode', () => {
  it('separa hebraico pontuado em grafemas (letra + sinais)', () => {
    expect(splitGraphemes('שָׁלוֹם')).toEqual(['שָׁ', 'ל', 'וֹ', 'ם'])
    expect(splitGraphemes('בְּרֵאשִׁית')).toHaveLength(6)
  })
  it('separa grego politônico sem quebrar acentos e espíritos', () => {
    expect(splitGraphemes('ἀρχῇ')).toEqual(['ἀ', 'ρ', 'χ', 'ῇ'])
    expect(splitGraphemes('ἄνθρωπος')).toHaveLength(8)
  })
  it('remove cantilação preservando o niqqud, e o niqqud preservando as consoantes', () => {
    expect(stripCantillation('בְּרֵאשִׁ֖ית')).toBe('בְּרֵאשִׁית'.normalize('NFC'))
    expect(stripNiqqud('בְּרֵאשִׁ֖ית')).toBe('בראשית')
    expect(stripGreekDiacritics('ἐν ἀρχῇ ἦν')).toBe('εν αρχη ην')
  })
  it('detecta texto fora de NFC, letra latina infiltrada e escrita trocada', () => {
    expect(findUnicodeIssues('λόγος', 'greek')).toEqual([])
    expect(findUnicodeIssues('λόγος'.normalize('NFD'), 'greek').map((i) => i.code)).toContain('not-nfc')
    expect(findUnicodeIssues('λoγος', 'greek').map((i) => i.code)).toContain('latin-lookalike')
    expect(findUnicodeIssues('λόγος', 'hebrew').map((i) => i.code)).toContain('mixed-script')
    expect(findUnicodeIssues('שָׁלוֹם‏', 'hebrew').map((i) => i.code)).toContain('bidi-control')
  })
})

describe('transliteração de apoio', () => {
  it.each([
    ['שָׁלוֹם', 'shalom'], ['מֶלֶךְ', 'melekh'], ['בְּרֵאשִׁית', 'bəreshit'], ['אֱלֹהִים', 'ʾelohim'], ['רוּחַ', 'ruaḥ'],
    ['וּבְכָל', 'uvkhol'], ['פָּנָיו', 'panav'], ['יְהוָה', 'YHWH'], ['הָאָרֶץ', 'haʾarets'],
  ])('hebraico %s → %s', (word, expected) => expect(transliterateHebrew(word)).toBe(expected))

  it.each([
    ['λόγος', 'logos'], ['ἀρχή', 'archē'], ['ὁ', 'ho'], ['υἱός', 'hyios'], ['εὐαγγέλιον', 'euangelion'], ['ῥῆμα', 'rhēma'], ['οὐρανός', 'ouranos'],
  ])('grego %s → %s', (word, expected) => expect(transliterateGreek(word)).toBe(expected))
})
